import { labelSize, NODE_HEIGHT, sizeNode, type Measure } from "./measure";
import type {
  Box,
  GraphEdge,
  GraphLayout,
  GraphModel,
  PlacedEdge,
  PlacedGroup,
  PlacedNode,
  Point,
} from "./types";

const COLUMN_WIDTH = 196;
const COLUMN_GAP = 12;
const ROW_GAP = 54;
const LANE_PADDING = 18;
const LANE_TOP = 46;
const LANE_GAP = 28;
const MARGIN = 24;
const STUB = 16;
const CLEARANCE = 8;
const TRACK = 8;
const BEND_COST = 40;
const WRONG_SIDE_COST = 70;
const OVERLAP_COST = 30;
const CROSS_COST = 24;
const MAX_NODES_PER_ROW = 3;

type Side = "right" | "bottom" | "left" | "top";

const DIRECTIONS: readonly { side: Side; dx: number; dy: number }[] = [
  { side: "right", dx: 1, dy: 0 },
  { side: "bottom", dx: 0, dy: 1 },
  { side: "left", dx: -1, dy: 0 },
  { side: "top", dx: 0, dy: -1 },
];
const SIDES: readonly Side[] = ["right", "bottom", "left", "top"];
const SIDE_INDEX: Record<Side, number> = { right: 0, bottom: 1, left: 2, top: 3 };
const OUT_COST: Record<Side, number> = {
  right: 0,
  bottom: 0,
  left: WRONG_SIDE_COST,
  top: WRONG_SIDE_COST,
};
const IN_COST: Record<Side, number> = {
  left: 0,
  top: 0,
  right: WRONG_SIDE_COST,
  bottom: WRONG_SIDE_COST,
};

interface Port {
  side: Side;
  px: number;
  py: number;
  sx: number;
  sy: number;
  cost: number;
}

interface Grid {
  xs: number[];
  ys: number[];
  indexX: Map<number, number>;
  indexY: Map<number, number>;
  width: number;
  height: number;
  boxes: Box[];
  blockedH: Uint8Array;
  blockedV: Uint8Array;
  usedH: Uint8Array;
  usedV: Uint8Array;
}

interface Routed {
  from: Side;
  to: Side;
  points: Point[];
}

function rankNodes(model: GraphModel): Map<string, number> {
  const outgoing = new Map<string, string[]>();
  for (const edge of model.edges) {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
  }
  const state = new Map<string, "active" | "done">();
  const order: string[] = [];
  const forward = new Map<string, string[]>();
  const visit = (id: string): void => {
    state.set(id, "active");
    for (const next of outgoing.get(id) ?? []) {
      if (state.get(next) === "active") {
        continue;
      }
      forward.set(id, [...(forward.get(id) ?? []), next]);
      if (!state.has(next)) {
        visit(next);
      }
    }
    state.set(id, "done");
    order.push(id);
  };
  for (const node of model.nodes) {
    if (!state.has(node.id)) {
      visit(node.id);
    }
  }
  const ranks = new Map<string, number>();
  for (const id of order.toReversed()) {
    const rank = ranks.get(id) ?? 0;
    ranks.set(id, rank);
    for (const next of forward.get(id) ?? []) {
      ranks.set(next, Math.max(ranks.get(next) ?? 0, rank + 1));
    }
  }
  return ranks;
}

function placeNodes(model: GraphModel, measure: Measure) {
  const ranks = rankNodes(model);
  const looseId = "\u0000loose";
  const lanes = [
    ...(model.nodes.some((node) => node.parentId === undefined)
      ? [{ id: looseId, label: "", parentId: undefined }]
      : []),
    ...model.groups,
  ];
  const sizes = new Map(
    model.nodes.map((node) => [
      node.id,
      sizeNode(
        { ...node, shape: "card" },
        node.icon ?? (node.shape === "decision" ? "decision" : "code"),
        measure,
      ),
    ]),
  );
  const rows = lanes.map((lane) => {
    const members = model.nodes
      .filter((node) => (node.parentId ?? looseId) === lane.id)
      .toSorted((a, b) => (ranks.get(a.id) ?? 0) - (ranks.get(b.id) ?? 0));
    const laneRows = new Map<number, typeof members>();
    let row = 0;
    for (const node of members) {
      row = Math.max(row, ranks.get(node.id) ?? 0);
      if ((laneRows.get(row)?.length ?? 0) === MAX_NODES_PER_ROW) {
        row += 1;
      }
      laneRows.set(row, [...(laneRows.get(row) ?? []), node]);
    }
    return laneRows;
  });
  const rowCount = Math.max(
    1,
    ...rows.flatMap((laneRows) => [...laneRows.keys()].map((row) => row + 1)),
  );
  const rowHeight = Math.max(NODE_HEIGHT, ...[...sizes.values()].map((size) => size.h));

  const nodes: PlacedNode[] = [];
  const groups: PlacedGroup[] = [];
  const laneHeight = LANE_TOP + rowCount * rowHeight + (rowCount - 1) * ROW_GAP + LANE_PADDING;
  let x = MARGIN;
  lanes.forEach((lane, laneIndex) => {
    const laneRows = rows[laneIndex] ?? new Map<number, GraphModel["nodes"]>();
    let inner = 2 * COLUMN_WIDTH + COLUMN_GAP;
    for (const members of laneRows.values()) {
      const widest = Math.max(...members.map((node) => sizes.get(node.id)?.w ?? 0));
      inner = Math.max(inner, members.length * widest + (members.length - 1) * COLUMN_GAP);
    }
    for (const [row, members] of laneRows) {
      const w = (inner - (members.length - 1) * COLUMN_GAP) / members.length;
      members.forEach((node, index) => {
        const size = sizes.get(node.id);
        if (size !== undefined) {
          nodes.push({
            ...node,
            shape: "card",
            ...size,
            x: x + LANE_PADDING + index * (w + COLUMN_GAP),
            y: MARGIN + LANE_TOP + row * (rowHeight + ROW_GAP),
            w,
            h: rowHeight,
          });
        }
      });
    }
    groups.push({
      id: lane.id,
      label: lane.label,
      parentId: undefined,
      lane: true,
      x,
      y: MARGIN,
      w: inner + 2 * LANE_PADDING,
      h: laneHeight,
    });
    x += inner + 2 * LANE_PADDING + LANE_GAP;
  });

  return {
    nodes,
    groups,
    width: x - LANE_GAP + MARGIN,
    height: MARGIN * 2 + laneHeight,
    rowHeight,
  };
}

function portsOf(
  node: Box,
  costs: Record<Side, number>,
  sides: readonly Side[],
  offset = 0,
): Port[] {
  return sides.map((side) => {
    const direction = DIRECTIONS[SIDE_INDEX[side]];
    const horizontal = side === "left" || side === "right";
    const px = horizontal
      ? side === "right"
        ? node.x + node.w
        : node.x
      : node.x + node.w / 2 + offset;
    const py = horizontal
      ? node.y + node.h / 2 + offset
      : side === "bottom"
        ? node.y + node.h
        : node.y;
    return {
      side,
      px,
      py,
      sx: px + (direction?.dx ?? 0) * STUB,
      sy: py + (direction?.dy ?? 0) * STUB,
      cost: costs[side],
    };
  });
}

function touchesBox(boxes: Box[], x1: number, y1: number, x2: number, y2: number): boolean {
  return boxes.some(
    (box) =>
      Math.max(x1, x2) > box.x - CLEARANCE &&
      Math.min(x1, x2) < box.x + box.w + CLEARANCE &&
      Math.max(y1, y2) > box.y - CLEARANCE &&
      Math.min(y1, y2) < box.y + box.h + CLEARANCE,
  );
}

function buildGrid(
  boxes: Box[],
  lanes: PlacedGroup[],
  size: { width: number; height: number; rowHeight: number },
  ports: Port[],
): Grid {
  const xSet = new Set<number>();
  const ySet = new Set<number>();
  for (const box of boxes) {
    xSet.add(box.x - STUB).add(box.x + box.w + STUB);
    ySet.add(box.y - STUB).add(box.y + box.h + STUB);
  }
  for (const port of ports) {
    xSet.add(port.sx);
    ySet.add(port.sy);
  }
  lanes.forEach((lane, index) => {
    if (index > 0) {
      const center = lane.x - LANE_GAP / 2;
      for (const k of [0, -1, 1, -2, 2]) {
        xSet.add(center + k * TRACK);
      }
    }
  });
  for (const y of new Set(boxes.map((box) => box.y))) {
    for (const k of [-1, 0, 1]) {
      ySet.add(y + size.rowHeight + ROW_GAP / 2 + k * TRACK);
    }
  }
  for (const k of [0, 1]) {
    xSet.add(MARGIN / 2 - k * TRACK + TRACK / 2);
    xSet.add(size.width - MARGIN / 2 + k * TRACK - TRACK / 2);
    ySet.add(size.height - MARGIN / 2 + k * TRACK - TRACK / 2);
  }
  const xs = [...xSet].toSorted((a, b) => a - b);
  const ys = [...ySet].toSorted((a, b) => a - b);
  const width = xs.length;
  const height = ys.length;
  const blockedH = new Uint8Array(width * height);
  const blockedV = new Uint8Array(width * height);
  ys.forEach((y, yi) => {
    xs.forEach((x, xi) => {
      const nextX = xs[xi + 1];
      const nextY = ys[yi + 1];
      if (nextX !== undefined && touchesBox(boxes, x, y, nextX, y)) {
        blockedH[xi + yi * width] = 1;
      }
      if (nextY !== undefined && touchesBox(boxes, x, y, x, nextY)) {
        blockedV[xi + yi * width] = 1;
      }
    });
  });
  return {
    xs,
    ys,
    indexX: new Map(xs.map((value, index) => [value, index])),
    indexY: new Map(ys.map((value, index) => [value, index])),
    width,
    height,
    boxes,
    blockedH,
    blockedV,
    usedH: new Uint8Array(width * height),
    usedV: new Uint8Array(width * height),
  };
}

class MinHeap {
  readonly #items: [number, number, number][] = [];

  public get size(): number {
    return this.#items.length;
  }

  public push(item: [number, number, number]): void {
    const items = this.#items;
    items.push(item);
    let index = items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (items[parent]![0] <= items[index]![0]) {
        break;
      }
      [items[parent], items[index]] = [items[index]!, items[parent]!];
      index = parent;
    }
  }

  public pop(): [number, number, number] {
    const items = this.#items;
    const top = items[0]!;
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let index = 0;
      for (;;) {
        const left = 2 * index + 1;
        const right = left + 1;
        let least = index;
        if (left < items.length && items[left]![0] < items[least]![0]) {
          least = left;
        }
        if (right < items.length && items[right]![0] < items[least]![0]) {
          least = right;
        }
        if (least === index) {
          break;
        }
        [items[least], items[index]] = [items[index]!, items[least]!];
        index = least;
      }
    }
    return top;
  }
}

function simplify(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    const a = result[result.length - 2];
    const b = result[result.length - 1];
    if (b !== undefined && b.x === point.x && b.y === point.y) {
      continue;
    }
    if (
      a !== undefined &&
      b !== undefined &&
      ((a.x === b.x && b.x === point.x) || (a.y === b.y && b.y === point.y))
    ) {
      result[result.length - 1] = point;
    } else {
      result.push(point);
    }
  }
  return result;
}

interface Search {
  grid: Grid;
  terminal: number;
  best: Float64Array;
  previous: Int32Array;
  startOf: Map<number, Port>;
  heap: MinHeap;
  goals: { goal: Port; xi: number; yi: number }[];
  goalPort: Port | undefined;
}

function estimate(search: Search, xi: number, yi: number): number {
  const { xs, ys } = search.grid;
  return Math.min(
    ...search.goals.map(
      (item) => Math.abs(xs[xi]! - xs[item.xi]!) + Math.abs(ys[yi]! - ys[item.yi]!),
    ),
  );
}

function isFreePort(grid: Grid, port: Port): boolean {
  return !touchesBox(grid.boxes, port.sx, port.sy, port.sx, port.sy);
}

function seedStarts(search: Search, starts: Port[]): void {
  const { indexX, indexY, width } = search.grid;
  for (const start of starts.filter((port) => isFreePort(search.grid, port))) {
    const xi = indexX.get(start.sx)!;
    const yi = indexY.get(start.sy)!;
    const state = (xi + yi * width) * 4 + SIDE_INDEX[start.side];
    if (start.cost < search.best[state]!) {
      search.best[state] = start.cost;
      search.startOf.set(state, start);
      search.heap.push([start.cost + estimate(search, xi, yi), start.cost, state]);
    }
  }
}

function markPathUsed(grid: Grid, path: { xi: number; yi: number }[]): void {
  path.slice(1).forEach((point, index) => {
    const last = path[index]!;
    if (last.yi === point.yi) {
      grid.usedH[Math.min(last.xi, point.xi) + last.yi * grid.width] = 1;
    } else {
      grid.usedV[last.xi + Math.min(last.yi, point.yi) * grid.width] = 1;
    }
  });
}

function buildRoute(search: Search): Routed {
  const { grid, previous, terminal } = search;
  const cells: number[] = [];
  for (let walker = previous[terminal]!; walker !== -1; walker = previous[walker]!) {
    cells.push(walker);
  }
  cells.reverse();
  const start = search.startOf.get(cells[0]!)!;
  const goal = search.goalPort!;
  const path = cells.map((value) => {
    const cell = value >> 2;
    const xi = cell % grid.width;
    const yi = Math.floor(cell / grid.width);
    return { x: grid.xs[xi]!, y: grid.ys[yi]!, xi, yi };
  });
  markPathUsed(grid, path);
  return {
    from: start.side,
    to: goal.side,
    points: simplify([{ x: start.px, y: start.py }, ...path, { x: goal.px, y: goal.py }]),
  };
}

function tryFinish(search: Search, state: number, cost: number): void {
  const cell = state >> 2;
  const direction = state & 3;
  const xi = cell % search.grid.width;
  const yi = Math.floor(cell / search.grid.width);
  for (const item of search.goals.filter((goal) => goal.xi === xi && goal.yi === yi)) {
    const inward = (SIDE_INDEX[item.goal.side] + 2) % 4;
    const finish = cost + item.goal.cost + (direction === inward ? 0 : BEND_COST);
    if (direction !== (inward + 2) % 4 && finish < search.best[search.terminal]!) {
      search.best[search.terminal] = finish;
      search.previous[search.terminal] = state;
      search.goalPort = item.goal;
      search.heap.push([finish, finish, search.terminal]);
    }
  }
}

function stepCost(
  grid: Grid,
  xi: number,
  yi: number,
  next: number,
  direction: number,
): number | null {
  const { xs, ys, width, height, blockedH, blockedV, usedH, usedV } = grid;
  const nx = xi + DIRECTIONS[next]!.dx;
  const ny = yi + DIRECTIONS[next]!.dy;
  if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
    return null;
  }
  const horizontal = next % 2 === 0;
  const segment = horizontal ? Math.min(xi, nx) + yi * width : xi + Math.min(yi, ny) * width;
  if ((horizontal ? blockedH : blockedV)[segment] === 1) {
    return null;
  }
  const length = Math.abs(xs[nx]! - xs[xi]!) + Math.abs(ys[ny]! - ys[yi]!);
  const overlap = (horizontal ? usedH : usedV)[segment] === 1 ? OVERLAP_COST + length * 2 : 0;
  const crossesLine = horizontal
    ? usedV[nx + ny * width] === 1 && ny > 0 && usedV[nx + (ny - 1) * width] === 1
    : usedH[nx + ny * width] === 1 && nx > 0 && usedH[nx - 1 + ny * width] === 1;
  return length + (next === direction ? 0 : BEND_COST) + overlap + (crossesLine ? CROSS_COST : 0);
}

function expand(search: Search, state: number, cost: number): void {
  const { width } = search.grid;
  const cell = state >> 2;
  const direction = state & 3;
  const xi = cell % width;
  const yi = Math.floor(cell / width);
  for (let next = 0; next < 4; next += 1) {
    const step =
      next === (direction + 2) % 4 ? null : stepCost(search.grid, xi, yi, next, direction);
    if (step !== null) {
      const nx = xi + DIRECTIONS[next]!.dx;
      const ny = yi + DIRECTIONS[next]!.dy;
      const nextState = (nx + ny * width) * 4 + next;
      if (cost + step < search.best[nextState]!) {
        search.best[nextState] = cost + step;
        search.previous[nextState] = state;
        search.heap.push([cost + step + estimate(search, nx, ny), cost + step, nextState]);
      }
    }
  }
}

/** A* over a sparse grid. The state includes direction, so each bend has a cost. */
function route(grid: Grid, starts: Port[], goals: Port[]): Routed | null {
  const terminal = grid.width * grid.height * 4;
  const search: Search = {
    grid,
    terminal,
    best: new Float64Array(terminal + 1).fill(Number.POSITIVE_INFINITY),
    previous: new Int32Array(terminal + 1).fill(-1),
    startOf: new Map(),
    heap: new MinHeap(),
    goals: goals
      .filter((goal) => isFreePort(grid, goal))
      .map((goal) => ({ goal, xi: grid.indexX.get(goal.sx)!, yi: grid.indexY.get(goal.sy)! })),
    goalPort: undefined,
  };
  seedStarts(search, starts);
  while (search.heap.size > 0) {
    const [, cost, state] = search.heap.pop();
    if (cost <= search.best[state]!) {
      if (state === terminal) {
        return buildRoute(search);
      }
      tryFinish(search, state, cost);
      expand(search, state, cost);
    }
  }
  return null;
}

/**
 * The first pass selects a node side for each line. The second pass spreads the lines that share a
 * side, so they leave the node apart, and routes them again.
 */
function routeEdges(
  edges: GraphEdge[],
  nodes: Map<string, PlacedNode>,
  lanes: PlacedGroup[],
  size: { width: number; height: number; rowHeight: number },
): Map<GraphEdge, Point[]> {
  const boxes = [...nodes.values()];
  const distance = (edge: GraphEdge): number => {
    const a = nodes.get(edge.from)!;
    const b = nodes.get(edge.to)!;
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  };
  const order = edges
    .filter((edge) => edge.from !== edge.to)
    .toSorted((a, b) => distance(a) - distance(b));
  const candidates = boxes.flatMap((box) => portsOf(box, OUT_COST, SIDES));
  const firstGrid = buildGrid(boxes, lanes, size, candidates);
  const chosen = new Map<GraphEdge, Routed>();
  for (const edge of order) {
    const routed = route(
      firstGrid,
      portsOf(nodes.get(edge.from)!, OUT_COST, SIDES),
      portsOf(nodes.get(edge.to)!, IN_COST, SIDES),
    );
    if (routed === null) {
      throw new Error(`No route for ${edge.from} to ${edge.to}.`);
    }
    chosen.set(edge, routed);
  }

  const onSide = new Map<string, { edge: GraphEdge; end: "from" | "to"; other: PlacedNode }[]>();
  const add = (
    id: string,
    side: Side,
    edge: GraphEdge,
    end: "from" | "to",
    other: PlacedNode,
  ): void => {
    const key = `${id}\u0000${side}`;
    onSide.set(key, [...(onSide.get(key) ?? []), { edge, end, other }]);
  };
  for (const [edge, routed] of chosen) {
    add(edge.from, routed.from, edge, "from", nodes.get(edge.to)!);
    add(edge.to, routed.to, edge, "to", nodes.get(edge.from)!);
  }
  const offsets = new Map<GraphEdge, { from: number; to: number }>();
  for (const edge of order) {
    offsets.set(edge, { from: 0, to: 0 });
  }
  for (const [key, items] of onSide) {
    const separator = key.lastIndexOf("\u0000");
    const side = key.slice(separator + 1);
    const node = nodes.get(key.slice(0, separator))!;
    const horizontal = side === "left" || side === "right";
    items.sort((a, b) => (horizontal ? a.other.y - b.other.y : a.other.x - b.other.x));
    const room = horizontal ? node.h - 20 : node.w - 60;
    const gap = items.length > 1 ? Math.min(12, room / (items.length - 1)) : 0;
    items.forEach((item, index) => {
      offsets.get(item.edge)![item.end] = Math.round((index - (items.length - 1) / 2) * gap);
    });
  }

  const fixed = order.map((edge) => {
    const routed = chosen.get(edge)!;
    const offset = offsets.get(edge)!;
    return {
      edge,
      start: portsOf(nodes.get(edge.from)!, OUT_COST, [routed.from], offset.from)[0]!,
      goal: portsOf(nodes.get(edge.to)!, IN_COST, [routed.to], offset.to)[0]!,
    };
  });
  const grid = buildGrid(
    boxes,
    lanes,
    size,
    fixed.flatMap(({ start, goal }) => [start, goal]),
  );
  const routes = new Map<GraphEdge, Point[]>();
  for (const { edge, start, goal } of fixed) {
    const routed = route(grid, [start], [goal]);
    if (routed === null) {
      throw new Error(`No route for ${edge.from} to ${edge.to}.`);
    }
    routes.set(edge, routed.points);
  }
  return routes;
}

function overlaps(a: Box, b: Box, margin = 4): boolean {
  return (
    a.x < b.x + b.w + margin &&
    a.x + a.w + margin > b.x &&
    a.y < b.y + b.h + margin &&
    a.y + a.h + margin > b.y
  );
}

function segmentCrossesBox(a: Point, b: Point, box: Box): boolean {
  return (
    Math.max(a.x, b.x) > box.x &&
    Math.min(a.x, b.x) < box.x + box.w &&
    Math.max(a.y, b.y) > box.y &&
    Math.min(a.y, b.y) < box.y + box.h
  );
}

function placeLabels(
  routes: Map<GraphEdge, Point[]>,
  nodes: PlacedNode[],
  measure: Measure,
): Map<GraphEdge, Box> {
  const placed: Box[] = [];
  const nodeBoxes = nodes.map((node) => ({ x: node.x, y: node.y - 8, w: node.w, h: node.h + 8 }));
  const result = new Map<GraphEdge, Box>();
  for (const [edge, points] of routes) {
    if (edge.label.length === 0) {
      continue;
    }
    const { w, h } = labelSize(edge.label, measure);
    let best: (Box & { score: number }) | undefined;
    points.slice(1).forEach((b, index) => {
      const a = points[index]!;
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      for (const t of [0.5, 0.35, 0.65, 0.2, 0.8]) {
        const box = { x: a.x + (b.x - a.x) * t - w / 2, y: a.y + (b.y - a.y) * t - h / 2, w, h };
        let score = -length - (t === 0.5 ? 10 : 0);
        if (nodeBoxes.some((node) => overlaps(box, node))) {
          score += 10_000;
        }
        if (placed.some((other) => overlaps(box, other))) {
          score += 10_000;
        }
        for (const [otherEdge, other] of routes) {
          if (otherEdge !== edge) {
            other.slice(1).forEach((end, k) => {
              if (segmentCrossesBox(other[k]!, end, box)) {
                score += 60;
              }
            });
          }
        }
        if (best === undefined || score < best.score) {
          best = { ...box, score };
        }
      }
    });
    if (best !== undefined) {
      placed.push(best);
      result.set(edge, { x: best.x, y: best.y, w: best.w, h: best.h });
    }
  }
  return result;
}

export function layoutLanes(model: GraphModel, measure: Measure): GraphLayout {
  const { nodes, groups, width, height, rowHeight } = placeNodes(model, measure);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visible = model.edges.filter((edge) => !edge.hidden);
  const routes = routeEdges(visible, byId, groups, { width, height, rowHeight });
  const labels = placeLabels(routes, nodes, measure);
  const edges: PlacedEdge[] = visible.map((edge) => ({
    ...edge,
    points: routes.get(edge) ?? [],
    labelBox: labels.get(edge),
  }));
  return { kind: "graph", heading: model.heading, width, height, groups, nodes, edges };
}
