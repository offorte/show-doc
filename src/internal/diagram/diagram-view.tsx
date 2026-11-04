import {
  Background,
  BackgroundVariant,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";

import { EXPAND_ICON_PATH, Icon } from "./icons";
import { SequenceDrawing } from "./sequence-view";
import type {
  DiagramLayout,
  EdgeHead,
  GraphLayout,
  PlacedEdge,
  PlacedGroup,
  PlacedNode,
  Point,
  SequenceLayout,
  Status,
} from "./types";

const STATUS_LABEL: Record<Status, string> = { new: "NEW", changed: "CHANGED", removed: "REMOVED" };
const PAGE_MAX_ZOOM = 1.25;
const INLINE_MAX_HEIGHT = 0.85;
const NO_TEXT_SHAPES = new Set(["start", "end", "choice", "bar"]);

type LaneNode = Node<{ group: PlacedGroup }, "lane">;
type DiagramNode = Node<{ node: PlacedNode }, "diagram">;
type SequenceNode = Node<{ layout: SequenceLayout }, "sequence">;
type RoutedEdge = Edge<{ edge: PlacedEdge }, "routed">;

function HiddenHandles() {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        className="hidden-handle"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="hidden-handle"
      />
    </>
  );
}

function LaneView({ data }: NodeProps<LaneNode>) {
  const { group } = data;
  return (
    <div className={group.lane ? "lane-box" : "group-box"}>
      {group.label === "" ? null : <span className="lane-title">{group.label}</span>}
      <HiddenHandles />
    </div>
  );
}

function nodeStyle(node: PlacedNode): CSSProperties {
  return {
    ...(node.colors?.fill === undefined ? {} : { "--node-fill": node.colors.fill }),
    ...(node.colors?.stroke === undefined ? {} : { "--node-stroke": node.colors.stroke }),
    ...(node.colors?.color === undefined ? {} : { "--node-ink": node.colors.color }),
  } as CSSProperties;
}

function NodeView({ data }: NodeProps<DiagramNode>) {
  const { node } = data;
  const status = node.status ?? "none";
  return (
    <div className={`shape shape-${node.shape} s-${status}`} style={nodeStyle(node)}>
      {node.shape === "decision" ? (
        <svg
          className="decision-shape"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M50 1 99 50 50 99 1 50z" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : null}
      {node.chip === undefined ? null : (
        <span className="chip">
          <Icon name={node.chip} />
        </span>
      )}
      {NO_TEXT_SHAPES.has(node.shape) ? null : (
        <span className="texts">
          {node.titleLines.map((line, index) => (
            <strong key={index}>{line}</strong>
          ))}
          {node.sub.map((line, index) => (
            <code key={index}>{line}</code>
          ))}
        </span>
      )}
      {node.status === undefined ? null : <span className="pill">{STATUS_LABEL[node.status]}</span>}
      <HiddenHandles />
    </div>
  );
}

function SequenceView({ data }: NodeProps<SequenceNode>) {
  return (
    <>
      <SequenceDrawing layout={data.layout} />
      <HiddenHandles />
    </>
  );
}

function roundedPath(points: Point[], radius = 10): string {
  const first = points[0];
  const last = points.at(-1);
  if (first === undefined || last === undefined) {
    return "";
  }
  let path = `M${first.x} ${first.y}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    const c = points[index + 1]!;
    const r = Math.min(
      radius,
      Math.hypot(b.x - a.x, b.y - a.y) / 2,
      Math.hypot(c.x - b.x, c.y - b.y) / 2,
    );
    const fromX = b.x - Math.sign(b.x - a.x) * r;
    const fromY = b.y - Math.sign(b.y - a.y) * r;
    const toX = b.x + Math.sign(c.x - b.x) * r;
    const toY = b.y + Math.sign(c.y - b.y) * r;
    path += ` L${fromX} ${fromY} Q${b.x} ${b.y} ${toX} ${toY}`;
  }
  return `${path} L${last.x} ${last.y}`;
}

function endMark(head: EdgeHead, tip: Point, from: Point, thick: boolean) {
  const dx = Math.sign(tip.x - from.x);
  const dy = Math.sign(tip.y - from.y);
  const size = thick ? 8 : 6;
  switch (head) {
    case "arrow": {
      const width = size * 0.7;
      const points = dx
        ? `${tip.x},${tip.y} ${tip.x - dx * size},${tip.y - width} ${tip.x - dx * size},${tip.y + width}`
        : `${tip.x},${tip.y} ${tip.x - width},${tip.y - dy * size} ${tip.x + width},${tip.y - dy * size}`;
      return { inset: size, mark: <polygon className="head" points={points} /> };
    }
    case "circle":
      return {
        inset: 8,
        mark: <circle className="head" cx={tip.x - dx * 4} cy={tip.y - dy * 4} r="4" />,
      };
    case "cross": {
      const x = tip.x - dx * 5;
      const y = tip.y - dy * 5;
      return {
        inset: 2,
        mark: <path className="cross" d={`M${x - 4} ${y - 4} l8 8 M${x - 4} ${y + 4} l8 -8`} />,
      };
    }
    case "none":
      return { inset: 0, mark: null };
  }
}

function moved(point: Point, toward: Point, inset: number): Point {
  return {
    x: point.x + Math.sign(toward.x - point.x) * inset,
    y: point.y + Math.sign(toward.y - point.y) * inset,
  };
}

function RoutedEdgeView({ data }: EdgeProps<RoutedEdge>) {
  const edge = data?.edge;
  if (edge === undefined || edge.hidden || edge.points.length < 2) {
    return null;
  }
  const points = edge.points;
  const first = points[0]!;
  const second = points[1]!;
  const tip = points.at(-1)!;
  const beforeTip = points.at(-2)!;
  const end = endMark(edge.endHead, tip, beforeTip, edge.thick);
  const start = endMark(edge.startHead, first, second, edge.thick);
  const drawn = [
    moved(first, second, start.inset),
    ...points.slice(1, -1),
    moved(tip, beforeTip, end.inset),
  ];
  const classes = ["edge", `s-${edge.status ?? "none"}`];
  if (edge.thick) {
    classes.push("thick");
  }
  if (edge.dashed || edge.status === "removed") {
    classes.push("dashed");
  }
  const style =
    edge.color === undefined ? undefined : ({ "--edge-color": edge.color } as CSSProperties);
  return (
    <g className={classes.join(" ")} style={style}>
      <path className="line" d={roundedPath(drawn)} />
      {end.mark}
      {edge.startHead === "none" ? (
        <circle className="head" cx={first.x} cy={first.y} r="2.5" />
      ) : (
        start.mark
      )}
      {edge.labelBox === undefined ? null : (
        <EdgeLabelRenderer>
          <div
            className={`edge-pill s-${edge.status ?? "none"}`}
            style={{
              transform: `translate(${edge.labelBox.x}px, ${edge.labelBox.y}px)`,
              width: edge.labelBox.w,
              height: edge.labelBox.h,
            }}
          >
            {edge.label.map((line, index) => (
              <span key={index}>{line}</span>
            ))}
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  );
}

const nodeTypes = { lane: LaneView, diagram: NodeView, sequence: SequenceView };
const edgeTypes = { routed: RoutedEdgeView };

function flowElements(layout: DiagramLayout): { nodes: Node[]; edges: Edge[] } {
  if (layout.kind === "sequence") {
    return {
      nodes: [
        {
          id: "sequence",
          type: "sequence",
          position: { x: 0, y: 0 },
          width: layout.width,
          height: layout.height,
          data: { layout },
        },
      ],
      edges: [],
    };
  }
  return graphElements(layout);
}

function graphElements(layout: GraphLayout): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: [
      ...layout.groups.map((group, index): Node => ({
        id: group.id,
        type: "lane",
        position: { x: group.x, y: group.y },
        width: group.w,
        height: group.h,
        zIndex: index - layout.groups.length,
        data: { group },
      })),
      ...layout.nodes.map((node): Node => ({
        id: node.id,
        type: "diagram",
        position: { x: node.x, y: node.y },
        width: node.w,
        height: node.h,
        zIndex: 1,
        data: { node },
      })),
    ],
    edges: layout.edges.map((edge): Edge => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: "routed",
      zIndex: 0,
      data: { edge },
    })),
  };
}

function statusCounts(layout: DiagramLayout): { status: Status; text: string }[] {
  if (layout.kind === "sequence") {
    return [];
  }
  const count = (status: Status): number =>
    layout.nodes.filter((node) => node.status === status).length;
  const rows: { status: Status; text: string }[] = [
    { status: "new", text: `+${count("new")} new` },
    { status: "changed", text: `~${count("changed")} changed` },
    { status: "removed", text: `−${count("removed")} removed` },
  ];
  return rows.filter((row) => count(row.status) > 0);
}

function Header({ layout }: { layout: DiagramLayout }) {
  const stats = statusCounts(layout);
  if (layout.heading.title === "" && stats.length === 0) {
    return null;
  }
  return (
    <div className="diagram-head">
      {layout.heading.title === "" ? null : (
        <div className="view-chip">
          {layout.heading.title}
          {layout.heading.meta === "" ? null : <code>{layout.heading.meta}</code>}
        </div>
      )}
      {stats.map((stat) => (
        <span key={stat.status} className="stat">
          <i className={`dot s-${stat.status}`} />
          {stat.text}
        </span>
      ))}
    </div>
  );
}

function ExpandButton({ onExpand }: { onExpand: () => void }) {
  return (
    <button type="button" aria-label="Expand diagram" onClick={onExpand}>
      <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d={EXPAND_ICON_PATH} />
      </svg>
    </button>
  );
}

function ZoomButtons({ fit }: { fit: () => void }) {
  const flow = useReactFlow();
  return (
    <>
      <button type="button" aria-label="Zoom out" onClick={() => void flow.zoomOut()}>
        −
      </button>
      <button type="button" aria-label="Fit diagram" onClick={fit}>
        Fit
      </button>
      <button type="button" aria-label="Zoom in" onClick={() => void flow.zoomIn()}>
        +
      </button>
    </>
  );
}

interface CanvasProps {
  layout: DiagramLayout;
  label: string;
  page: boolean;
  onExpand: (() => void) | undefined;
}

function Canvas({ layout, label, page, onExpand }: CanvasProps) {
  const flow = useReactFlow();
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const flowWidth = useStore((state) => state.width);
  const flowHeight = useStore((state) => state.height);
  const { nodes, edges } = useMemo(() => flowElements(layout), [layout]);
  const maxZoom = page ? PAGE_MAX_ZOOM : 1;
  // On a phone, a drag on an inline diagram must scroll the document.
  const canMoveCanvas = page || !window.matchMedia("(pointer: coarse)").matches;
  const fit = (): void => {
    void flow.fitView({ padding: 0.01, maxZoom });
  };

  useLayoutEffect(() => {
    const element = frame.current;
    if (element === null) {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // React Flow reports its size after the frame changes, so the fit waits for that size.
  useEffect(() => {
    if (flowWidth > 0 && flowHeight > 0) {
      fit();
    }
  }, [flowWidth, flowHeight, layout]);

  const scale = width > 0 ? Math.min(1, width / layout.width) : 1;
  const height = page
    ? undefined
    : Math.max(120, Math.min(layout.height * scale + 4, window.innerHeight * INLINE_MAX_HEIGHT));

  return (
    <>
      <Header layout={layout} />
      <div className="frame" ref={frame} style={height === undefined ? undefined : { height }}>
        <div className="flow" role="img" aria-label={label}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable={false}
            edgesFocusable={false}
            elementsSelectable={false}
            panOnDrag={canMoveCanvas}
            panOnScroll={false}
            zoomOnScroll={page}
            zoomOnDoubleClick={false}
            zoomOnPinch={canMoveCanvas}
            preventScrolling={page}
            minZoom={0.15}
            maxZoom={2.5}
            fitView
            fitViewOptions={{ padding: 0.01, maxZoom }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          </ReactFlow>
        </div>
        <div className="tools">
          {canMoveCanvas ? <ZoomButtons fit={fit} /> : null}
          {onExpand === undefined ? null : <ExpandButton onExpand={onExpand} />}
        </div>
      </div>
    </>
  );
}

export function mountDiagram(element: HTMLElement, props: CanvasProps): () => void {
  const root = createRoot(element);
  root.render(
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>,
  );
  return () => root.unmount();
}
