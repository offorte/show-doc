import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkExtendedEdge, ElkNode } from "elkjs/lib/elk-api";

import { labelSize, sizeNode, type Measure } from "./measure";
import type {
  Box,
  GraphLayout,
  GraphModel,
  PlacedEdge,
  PlacedGroup,
  PlacedNode,
  Point,
} from "./types";

const elk = new ELK();

const ELK_DIRECTION = { TB: "DOWN", BT: "UP", LR: "RIGHT", RL: "LEFT" } as const;
const IN_SIDE = { TB: "NORTH", BT: "SOUTH", LR: "WEST", RL: "EAST" } as const;
const OUT_SIDE = { TB: "SOUTH", BT: "NORTH", LR: "EAST", RL: "WEST" } as const;
const POINTED_SHAPES = new Set(["decision", "circle", "start", "end", "choice", "bar"]);

function sidePoint(side: string, w: number, h: number): Point {
  switch (side) {
    case "NORTH":
      return { x: w / 2, y: 0 };
    case "SOUTH":
      return { x: w / 2, y: h };
    case "WEST":
      return { x: 0, y: h / 2 };
    default:
      return { x: w, y: h / 2 };
  }
}

/** ELK puts a label beside its line. The look needs the label on the line. */
function moveLabelOntoLine(points: Point[], label: Box): Box {
  const centerX = label.x + label.w / 2;
  const centerY = label.y + label.h / 2;
  let best = label;
  let bestDistance = Number.POSITIVE_INFINITY;
  points.slice(1).forEach((b, index) => {
    const a = points[index]!;
    const x = Math.min(Math.max(centerX, Math.min(a.x, b.x)), Math.max(a.x, b.x));
    const y = Math.min(Math.max(centerY, Math.min(a.y, b.y)), Math.max(a.y, b.y));
    const distance = Math.hypot(x - centerX, y - centerY);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { x: x - label.w / 2, y: y - label.h / 2, w: label.w, h: label.h };
    }
  });
  return best;
}

export async function layoutWithElk(model: GraphModel, measure: Measure): Promise<GraphLayout> {
  const sized = new Map(model.nodes.map((node) => [node.id, sizeNode(node, node.icon, measure)]));
  const pointed = new Set(
    model.nodes.filter((node) => POINTED_SHAPES.has(node.shape)).map((node) => node.id),
  );

  const nodeElement = (id: string): ElkNode => {
    const size = sized.get(id);
    const w = size?.w ?? 0;
    const h = size?.h ?? 0;
    if (!pointed.has(id)) {
      return { id, width: w, height: h };
    }
    // Round and pointed shapes only touch their box at the middle of a side.
    const inSide = IN_SIDE[model.direction];
    const outSide = OUT_SIDE[model.direction];
    const inPoint = sidePoint(inSide, w, h);
    const outPoint = sidePoint(outSide, w, h);
    return {
      id,
      width: w,
      height: h,
      layoutOptions: { "elk.portConstraints": "FIXED_POS" },
      ports: [
        {
          id: `${id}\u0000in`,
          ...inPoint,
          width: 0,
          height: 0,
          layoutOptions: { "elk.port.side": inSide },
        },
        {
          id: `${id}\u0000out`,
          ...outPoint,
          width: 0,
          height: 0,
          layoutOptions: { "elk.port.side": outSide },
        },
      ],
    };
  };
  // ELK breaks cycles by model order, so children follow the order in which the lines use them.
  const parents = new Map<string, string | undefined>(
    [...model.groups, ...model.nodes].map((item) => [item.id, item.parentId]),
  );
  const firstUse = new Map<string, number>();
  for (const edge of model.edges) {
    for (const end of [edge.from, edge.to]) {
      for (let id: string | undefined = end; id !== undefined; id = parents.get(id)) {
        if (!firstUse.has(id)) {
          firstUse.set(id, firstUse.size);
        }
      }
    }
  }
  const useOrder = (id: string): number => firstUse.get(id) ?? Number.POSITIVE_INFINITY;
  const childrenOf = (parentId: string | undefined): ElkNode[] =>
    [
      ...model.groups
        .filter((group) => group.parentId === parentId)
        .map((group) => ({
          id: group.id,
          layoutOptions: { "elk.padding": "[top=40,left=18,bottom=18,right=18]" },
          labels: [{ text: group.label }],
          children: childrenOf(group.id),
        })),
      ...model.nodes
        .filter((node) => node.parentId === parentId)
        .map((node) => nodeElement(node.id)),
    ].toSorted((a, b) => useOrder(a.id) - useOrder(b.id));
  const edges: ElkExtendedEdge[] = model.edges.map((edge) => ({
    id: edge.id,
    sources: [pointed.has(edge.from) ? `${edge.from}\u0000out` : edge.from],
    targets: [pointed.has(edge.to) ? `${edge.to}\u0000in` : edge.to],
    labels:
      edge.label.length === 0
        ? []
        : [
            {
              text: edge.label.join(" "),
              width: labelSize(edge.label, measure).w,
              height: labelSize(edge.label, measure).h,
            },
          ],
  }));

  const result: ElkNode = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": ELK_DIRECTION[model.direction],
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.json.edgeCoords": "ROOT",
      "elk.json.shapeCoords": "ROOT",
      "elk.padding": "[top=24,left=24,bottom=24,right=24]",
      "elk.spacing.nodeNode": "36",
      "elk.spacing.edgeNode": "20",
      "elk.spacing.edgeEdge": "14",
      "elk.spacing.edgeLabel": "4",
      "elk.layered.spacing.nodeNodeBetweenLayers": "56",
      "elk.layered.spacing.edgeNodeBetweenLayers": "24",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.cycleBreaking.strategy": "MODEL_ORDER",
      "elk.edgeLabels.inline": "true",
    },
    children: childrenOf(undefined),
    edges,
  });

  const nodes: PlacedNode[] = [];
  const groups: PlacedGroup[] = [];
  const modelNodes = new Map(model.nodes.map((node) => [node.id, node]));
  const modelGroups = new Map(model.groups.map((group) => [group.id, group]));
  const visit = (element: ElkNode): void => {
    for (const child of element.children ?? []) {
      const box = { x: child.x ?? 0, y: child.y ?? 0, w: child.width ?? 0, h: child.height ?? 0 };
      const node = modelNodes.get(child.id);
      const size = sized.get(child.id);
      const group = modelGroups.get(child.id);
      if (node !== undefined && size !== undefined) {
        nodes.push({ ...node, ...size, ...box });
      } else if (group !== undefined) {
        groups.push({ ...group, ...box, lane: false });
      }
      visit(child);
    }
  };
  visit(result);

  const placedEdges = new Map((result.edges ?? []).map((edge) => [edge.id, edge]));
  const placed: PlacedEdge[] = model.edges.map((edge) => {
    const routed = placedEdges.get(edge.id) as ElkExtendedEdge | undefined;
    const points = (routed?.sections ?? []).flatMap((section) => [
      section.startPoint,
      ...(section.bendPoints ?? []),
      section.endPoint,
    ]);
    const label = routed?.labels?.[0];
    return {
      ...edge,
      points,
      labelBox:
        label === undefined
          ? undefined
          : moveLabelOntoLine(points, {
              x: label.x ?? 0,
              y: label.y ?? 0,
              w: label.width ?? 0,
              h: label.height ?? 0,
            }),
    };
  });

  return {
    kind: "graph",
    heading: model.heading,
    width: result.width ?? 0,
    height: result.height ?? 0,
    groups,
    nodes,
    edges: placed,
  };
}
