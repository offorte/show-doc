export type Status = "new" | "changed" | "removed";

export type IconName =
  | "code"
  | "window"
  | "box"
  | "play"
  | "queue"
  | "service"
  | "db"
  | "file"
  | "user"
  | "cloud"
  | "decision";

export type NodeShape =
  | "card"
  | "decision"
  | "terminal"
  | "circle"
  | "start"
  | "end"
  | "choice"
  | "bar"
  | "note";

export type EdgeHead = "none" | "arrow" | "circle" | "cross";

export type Direction = "TB" | "BT" | "LR" | "RL";

export interface Point {
  x: number;
  y: number;
}

export interface Box extends Point {
  w: number;
  h: number;
}

export interface NodeColors {
  fill: string | undefined;
  stroke: string | undefined;
  color: string | undefined;
}

export interface GraphNode {
  id: string;
  title: string;
  sub: string[];
  shape: NodeShape;
  status: Status | undefined;
  icon: IconName | undefined;
  colors: NodeColors | undefined;
  parentId: string | undefined;
}

export interface GraphGroup {
  id: string;
  label: string;
  parentId: string | undefined;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label: string[];
  dashed: boolean;
  thick: boolean;
  hidden: boolean;
  startHead: EdgeHead;
  endHead: EdgeHead;
  status: Status | undefined;
  color: string | undefined;
}

export interface Heading {
  title: string;
  meta: string;
}

export interface GraphModel {
  kind: "graph";
  heading: Heading;
  direction: Direction;
  useLanes: boolean;
  groups: GraphGroup[];
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SequenceActor {
  key: string;
  label: string[];
  icon: IconName;
}

export type SequenceHead = "none" | "arrow" | "open" | "cross";

export type BlockKind = "loop" | "alt" | "opt" | "par" | "critical" | "break" | "rect";

export type SequenceStep =
  | {
      type: "message";
      from: string;
      to: string;
      text: string[];
      dashed: boolean;
      head: SequenceHead;
      both: boolean;
      activate: boolean;
      creates: boolean;
      destroys: boolean;
      number: number | undefined;
    }
  | { type: "note"; from: string; to: string; placement: "left" | "right" | "over"; text: string[] }
  | { type: "open"; block: BlockKind; text: string }
  | { type: "section"; text: string }
  | { type: "close" }
  | { type: "activate"; who: string }
  | { type: "deactivate"; who: string };

export interface SequenceModel {
  kind: "sequence";
  heading: Heading;
  actors: SequenceActor[];
  boxes: { label: string; keys: string[] }[];
  steps: SequenceStep[];
}

export type DiagramModel = GraphModel | SequenceModel;

export interface PlacedNode extends GraphNode, Box {
  titleLines: string[];
  chip: IconName | undefined;
}

export interface PlacedGroup extends GraphGroup, Box {
  lane: boolean;
}

export interface PlacedEdge extends GraphEdge {
  points: Point[];
  labelBox: Box | undefined;
}

export interface GraphLayout {
  kind: "graph";
  heading: Heading;
  width: number;
  height: number;
  groups: PlacedGroup[];
  nodes: PlacedNode[];
  edges: PlacedEdge[];
}

export interface PlacedActor extends Box {
  key: string;
  label: string[];
  icon: IconName;
  lineTop: number;
  lineBottom: number;
  destroyed: boolean;
}

export interface PlacedMessage {
  points: Point[];
  labelBox: Box | undefined;
  text: string[];
  dashed: boolean;
  head: SequenceHead;
  both: boolean;
  number: number | undefined;
}

export interface PlacedNote extends Box {
  text: string[];
}

export interface PlacedBlock extends Box {
  block: BlockKind;
  text: string;
  textWidth: number;
  sections: { y: number; text: string; width: number }[];
}

export interface SequenceLayout {
  kind: "sequence";
  heading: Heading;
  width: number;
  height: number;
  boxes: (Box & { label: string })[];
  actors: PlacedActor[];
  activations: Box[];
  blocks: PlacedBlock[];
  notes: PlacedNote[];
  messages: PlacedMessage[];
}

export type DiagramLayout = GraphLayout | SequenceLayout;
