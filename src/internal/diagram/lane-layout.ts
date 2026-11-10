import { NODE_HEIGHT, sizeNode, type Measure } from "./measure";
import { outerTracks, placeEdges, TRACK, type Tracks } from "./route-edges";
import type { GraphLayout, GraphModel, PlacedGroup, PlacedNode } from "./types";

const COLUMN_WIDTH = 196;
const COLUMN_GAP = 12;
const ROW_GAP = 54;
const LANE_PADDING = 18;
const LANE_TOP = 46;
const LANE_GAP = 28;
const MARGIN = 24;
const MAX_NODES_PER_ROW = 3;

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

function laneTracks(
  nodes: PlacedNode[],
  lanes: PlacedGroup[],
  size: { width: number; height: number; rowHeight: number },
): Tracks {
  const outer = outerTracks(size, MARGIN);
  const between = lanes
    .slice(1)
    .flatMap((lane) => [0, -1, 1, -2, 2].map((k) => lane.x - LANE_GAP / 2 + k * TRACK));
  const belowRows = [...new Set(nodes.map((node) => node.y))].flatMap((y) =>
    [-1, 0, 1].map((k) => y + size.rowHeight + ROW_GAP / 2 + k * TRACK),
  );
  return { xs: [...between, ...outer.xs], ys: [...belowRows, ...outer.ys] };
}

export function layoutLanes(model: GraphModel, measure: Measure): GraphLayout {
  const { nodes, groups, width, height, rowHeight } = placeNodes(model, measure);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visible = model.edges.filter((edge) => !edge.hidden);
  const tracks = laneTracks(nodes, groups, { width, height, rowHeight });
  const edges = placeEdges(visible, byId, nodes, tracks, measure);
  return { kind: "graph", heading: model.heading, width, height, groups, nodes, edges };
}
