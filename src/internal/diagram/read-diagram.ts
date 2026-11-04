import type {
  BlockKind,
  Direction,
  EdgeHead,
  GraphEdge,
  GraphGroup,
  GraphModel,
  GraphNode,
  Heading,
  IconName,
  NodeColors,
  NodeShape,
  SequenceActor,
  SequenceHead,
  SequenceModel,
  SequenceStep,
  Status,
} from "./types";

interface RawNode {
  id: string;
  label?: string;
  shape?: string;
  isGroup?: boolean;
  parentId?: string;
  labelType?: string;
  cssClasses?: string;
  cssStyles?: string[];
  cssCompiledStyles?: string[];
  link?: string;
  icon?: string;
  img?: string;
}

interface RawEdge {
  id: string;
  start: string;
  end: string;
  label?: string;
  labelType?: string;
  arrowTypeStart?: string;
  arrowTypeEnd?: string;
  thickness?: string;
  pattern?: string;
  classes?: string;
  style?: string[] | string;
}

interface RawMessage {
  from?: string;
  to?: string;
  message?: unknown;
  type: number;
  placement?: number;
  activate?: boolean;
  centralConnection?: number;
}

interface RawActor {
  name: string;
  description?: string;
  type?: string;
  box?: unknown;
}

interface MermaidDb {
  getData?(): { nodes: RawNode[]; edges: RawEdge[] };
  getLinks?(): Map<string, unknown>;
  getDirection?(): string | undefined;
  getDiagramTitle?(): string;
  getActorKeys?(): string[];
  getActors?(): Map<string, RawActor>;
  getBoxes?(): { name?: string; actorKeys: string[] }[];
  getMessages?(): RawMessage[];
  getCreatedActors?(): Map<string, number>;
  getDestroyedActors?(): Map<string, number>;
  LINETYPE?: Record<string, number>;
  PLACEMENT?: Record<string, number>;
}

const STATUSES: ReadonlySet<string> = new Set(["new", "changed", "removed"]);
const ICON_NAMES: ReadonlySet<string> = new Set([
  "code",
  "window",
  "box",
  "play",
  "queue",
  "service",
  "db",
  "file",
  "user",
  "cloud",
  "decision",
]);
const FLOWCHART_SHAPES: Record<string, NodeShape> = {
  diamond: "decision",
  stadium: "terminal",
  circle: "circle",
  doublecircle: "circle",
};
const STATE_SHAPES: Record<string, NodeShape> = {
  stateStart: "start",
  stateEnd: "end",
  choice: "choice",
  fork: "bar",
  join: "bar",
  note: "note",
};
const ACTOR_ICONS: Record<string, IconName> = {
  actor: "user",
  database: "db",
  queue: "queue",
  collections: "box",
  boundary: "window",
  entity: "box",
  control: "service",
};
const ICON_PREFIX = /\bfa[bklrs]?:fa-|\bfa:/u;

/** Reverses the entity tokens that Mermaid writes into parsed text. */
function decodeMermaidEntities(text: string): string {
  return text
    .replace(/ﬂ°°/gu, "&#")
    .replace(/ﬂ°/gu, "&")
    .replace(/¶ß/gu, ";");
}

// The parser document is inert, so markup in a label cannot run.
function readLines(raw: string | undefined, markdown = false): string[] {
  if (raw === undefined || raw === "") {
    return [];
  }
  const withBreaks = decodeMermaidEntities(raw)
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/\\n/gu, "\n");
  const text = new DOMParser().parseFromString(withBreaks, "text/html").body.textContent ?? "";
  return text
    .split("\n")
    .map((line) => (markdown ? line.replace(/[*`]/gu, "") : line).trim())
    .filter((line) => line !== "");
}

function readHeading(source: string, fallbackTitle: string): Heading {
  const frontmatter = /^\s*---\s*\n([\s\S]*?)\n\s*---/u.exec(source)?.[1] ?? "";
  const declared = /^\s*title:\s*(.+?)\s*$/mu.exec(frontmatter)?.[1]?.replace(/^["']|["']$/gu, "");
  const [title = "", ...meta] = (declared ?? fallbackTitle).split(" | ");
  return { title: title.trim(), meta: meta.join(" | ").trim() };
}

function readColors(node: RawNode): NodeColors | undefined {
  const colors: NodeColors = { fill: undefined, stroke: undefined, color: undefined };
  for (const rule of [...(node.cssCompiledStyles ?? []), ...(node.cssStyles ?? [])]) {
    const [name = "", value = ""] = rule.split(":");
    const property = name.trim();
    if (property === "fill" || property === "stroke" || property === "color") {
      colors[property] = value.replace(/!important/u, "").trim();
    }
  }
  return colors.fill === undefined && colors.stroke === undefined && colors.color === undefined
    ? undefined
    : colors;
}

function readHead(type: string | undefined): EdgeHead {
  switch (type) {
    case "arrow_point":
    case "arrow_barb":
      return "arrow";
    case "arrow_circle":
      return "circle";
    case "arrow_cross":
      return "cross";
    default:
      return "none";
  }
}

function inferEdgeStatus(
  from: GraphNode | undefined,
  to: GraphNode | undefined,
): Status | undefined {
  const ends = [from?.status, to?.status];
  if (ends.includes("removed")) {
    return "removed";
  }
  if (ends.includes("new")) {
    return "new";
  }
  return ends[0] === "changed" && ends[1] === "changed" ? "changed" : undefined;
}

function readGraphNode(
  raw: RawNode,
  shapes: Record<string, NodeShape>,
  parentId: string | undefined,
): GraphNode {
  const [title = raw.id, ...sub] = readLines(raw.label, raw.labelType === "markdown");
  const classes = (raw.cssClasses ?? "").split(/\s+/u);
  const iconClass = classes.find((name) => name.startsWith("icon-"))?.slice(5);
  return {
    id: raw.id,
    title,
    sub,
    shape: shapes[raw.shape ?? ""] ?? "card",
    status: classes.find((name) => STATUSES.has(name)) as Status | undefined,
    icon:
      iconClass !== undefined && ICON_NAMES.has(iconClass)
        ? (iconClass as IconName)
        : raw.shape === "cylinder"
          ? "db"
          : undefined,
    colors: readColors(raw),
    parentId,
  };
}

function readGraphEdge(raw: RawEdge, nodes: Map<string, GraphNode>): GraphEdge {
  // Flowcharts give a list of rules. State diagrams give one string.
  const rules = typeof raw.style === "string" ? raw.style.split(";") : (raw.style ?? []);
  const color = rules
    .find((rule) => rule.trim().startsWith("stroke:"))
    ?.split(":")[1]
    ?.trim();
  return {
    id: raw.id,
    from: raw.start,
    to: raw.end,
    label: readLines(raw.label, raw.labelType === "markdown"),
    dashed: raw.pattern === "dotted" || (raw.classes ?? "").includes("note-edge"),
    thick: raw.thickness === "thick",
    hidden: raw.thickness === "invisible",
    startHead: readHead(raw.arrowTypeStart),
    endHead: readHead(raw.arrowTypeEnd),
    status: inferEdgeStatus(nodes.get(raw.start), nodes.get(raw.end)),
    color,
  };
}

function readDirection(db: MermaidDb): Direction {
  const direction = db.getDirection?.();
  return direction === "LR" || direction === "RL" || direction === "BT" ? direction : "TB";
}

/** Returns null when the source uses a feature that only Mermaid's own drawing can honor. */
function readFlowchart(db: MermaidDb, source: string): GraphModel | null {
  const data = db.getData?.();
  if (data === undefined) {
    return null;
  }
  if (
    data.nodes.some(
      (node) =>
        node.link !== undefined ||
        node.icon !== undefined ||
        node.img !== undefined ||
        ICON_PREFIX.test(node.label ?? ""),
    )
  ) {
    return null;
  }

  // Mermaid lists subgraphs in reverse source order.
  const groups: GraphGroup[] = data.nodes
    .filter((node) => node.isGroup === true)
    .map((node) => ({
      id: node.id,
      label: readLines(node.label).join(" "),
      parentId: node.parentId,
    }))
    .toReversed();
  const nodes = data.nodes
    .filter((node) => node.isGroup !== true)
    .map((node) => readGraphNode(node, FLOWCHART_SHAPES, node.parentId));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  // Lanes route lines between cards. ELK handles nesting, self-loops, and lines to a subgraph.
  const fitsLanes =
    groups.length > 0 &&
    groups.every((group) => group.parentId === undefined) &&
    data.edges.every(
      (edge) => edge.start !== edge.end && byId.has(edge.start) && byId.has(edge.end),
    );

  return {
    kind: "graph",
    heading: readHeading(source, db.getDiagramTitle?.() ?? ""),
    direction: readDirection(db),
    useLanes: fitsLanes,
    groups,
    nodes,
    edges: data.edges.map((edge) => readGraphEdge(edge, byId)),
  };
}

function readStateDiagram(db: MermaidDb, source: string): GraphModel | null {
  const data = db.getData?.();
  if (data === undefined || (db.getLinks?.().size ?? 0) > 0) {
    return null;
  }
  // A note group only wraps one note, so the note moves to the parent of that wrapper.
  const noteGroups = new Map(
    data.nodes.filter((node) => node.shape === "noteGroup").map((node) => [node.id, node.parentId]),
  );
  const parentOf = (node: RawNode): string | undefined =>
    node.parentId !== undefined && noteGroups.has(node.parentId)
      ? noteGroups.get(node.parentId)
      : node.parentId;
  const groups: GraphGroup[] = data.nodes
    .filter((node) => node.isGroup === true && node.shape !== "noteGroup")
    .map((node) => ({
      id: node.id,
      label: readLines(node.label).join(" "),
      parentId: parentOf(node),
    }));
  const nodes = data.nodes
    .filter((node) => node.isGroup !== true)
    .map((node) => readGraphNode(node, STATE_SHAPES, parentOf(node)));
  const byId = new Map(nodes.map((node) => [node.id, node]));

  return {
    kind: "graph",
    heading: readHeading(source, db.getDiagramTitle?.() ?? ""),
    direction: readDirection(db),
    useLanes: false,
    groups,
    nodes,
    edges: data.edges.map((edge) => readGraphEdge(edge, byId)),
  };
}

function readSequenceHead(name: string): SequenceHead {
  if (name.includes("CROSS")) {
    return "cross";
  }
  if (name.includes("OPEN")) {
    return "none";
  }
  return name.includes("POINT") ? "open" : "arrow";
}

const BLOCK_STARTS: Record<string, BlockKind> = {
  LOOP_START: "loop",
  ALT_START: "alt",
  OPT_START: "opt",
  PAR_START: "par",
  PAR_OVER_START: "par",
  CRITICAL_START: "critical",
  BREAK_START: "break",
  RECT_START: "rect",
};
const BLOCK_SECTIONS = new Set(["ALT_ELSE", "PAR_AND", "CRITICAL_OPTION"]);
const BLOCK_ENDS = new Set([
  "LOOP_END",
  "ALT_END",
  "OPT_END",
  "PAR_END",
  "CRITICAL_END",
  "BREAK_END",
  "RECT_END",
]);

interface SequenceContext {
  placements: Record<string, number>;
  createdAt: Set<number | undefined>;
  destroyedAt: Set<number | undefined>;
  numbering: { visible: boolean; next: number; step: number };
  // `A->>+B` gives a message with an activate flag and then a separate activation entry.
  activatedByMessage: string | undefined;
}

function readNote(
  message: RawMessage,
  text: string,
  placements: Record<string, number>,
): SequenceStep {
  const side =
    message.placement === placements.LEFTOF
      ? "left"
      : message.placement === placements.RIGHTOF
        ? "right"
        : "over";
  return {
    type: "note",
    from: message.from ?? "",
    to: message.to ?? message.from ?? "",
    placement: side,
    text: readLines(text),
  };
}

function readMessage(
  message: RawMessage,
  name: string,
  text: string,
  index: number,
  context: SequenceContext,
): SequenceStep {
  context.activatedByMessage = message.activate === true ? message.to : undefined;
  const number = context.numbering.visible ? context.numbering.next : undefined;
  context.numbering.next += context.numbering.step;
  return {
    type: "message",
    from: message.from ?? "",
    to: message.to ?? "",
    text: readLines(text),
    dashed: name.includes("DOTTED"),
    head: readSequenceHead(name),
    both: name.includes("BIDIRECTIONAL"),
    activate: message.activate === true,
    creates: context.createdAt.has(index),
    destroys: context.destroyedAt.has(index),
    number,
  };
}

function readBlockStep(name: string, text: string): SequenceStep | null {
  const block = BLOCK_STARTS[name];
  if (block !== undefined) {
    return { type: "open", block, text: block === "rect" ? "" : readLines(text).join(" ") };
  }
  if (BLOCK_SECTIONS.has(name)) {
    return { type: "section", text: readLines(text).join(" ") };
  }
  return BLOCK_ENDS.has(name) ? { type: "close" } : null;
}

function readActivation(
  name: string,
  message: RawMessage,
  context: SequenceContext,
): SequenceStep | null {
  const who = message.from ?? "";
  if (name === "ACTIVE_END") {
    return { type: "deactivate", who };
  }
  const repeated = context.activatedByMessage === message.from;
  context.activatedByMessage = undefined;
  return repeated ? null : { type: "activate", who };
}

function readNumbering(message: RawMessage, context: SequenceContext): void {
  const settings = message.message as { start?: number; step?: number; visible?: boolean };
  context.numbering = {
    visible: settings.visible ?? true,
    next: settings.start ?? context.numbering.next,
    step: settings.step ?? context.numbering.step,
  };
}

function readSequenceStep(
  message: RawMessage,
  name: string,
  index: number,
  context: SequenceContext,
): SequenceStep | null {
  const text = typeof message.message === "string" ? message.message : "";
  if (name === "AUTONUMBER") {
    readNumbering(message, context);
    return null;
  }
  if (name === "NOTE") {
    return readNote(message, text, context.placements);
  }
  if (name === "ACTIVE_START" || name === "ACTIVE_END") {
    return readActivation(name, message, context);
  }
  const blockStep = readBlockStep(name, text);
  if (blockStep !== null) {
    return blockStep;
  }
  return message.from !== undefined && message.to !== undefined
    ? readMessage(message, name, text, index, context)
    : null;
}

// Half arrows and central connection marks have no equivalent in ShowDoc's drawing.
function usesMermaidOnlyLine(message: RawMessage, lineTypes: Map<number, string>): boolean {
  return (
    /TOP|BOTTOM|CENTRAL/u.test(lineTypes.get(message.type) ?? "") ||
    (message.centralConnection ?? 0) > 0
  );
}

function readSequence(db: MermaidDb, source: string): SequenceModel | null {
  if (db.getActorKeys === undefined || db.getActors === undefined || db.getMessages === undefined) {
    return null;
  }
  const lineTypes = new Map(Object.entries(db.LINETYPE ?? {}).map(([name, code]) => [code, name]));
  const messages = db.getMessages();
  if (messages.some((message) => usesMermaidOnlyLine(message, lineTypes))) {
    return null;
  }
  const rawActors = db.getActors();
  const actors: SequenceActor[] = db.getActorKeys().map((key) => {
    const actor = rawActors.get(key);
    return {
      key,
      label: readLines(actor?.description ?? key),
      icon: ACTOR_ICONS[actor?.type ?? ""] ?? "service",
    };
  });
  const context: SequenceContext = {
    placements: db.PLACEMENT ?? {},
    createdAt: new Set(db.getCreatedActors?.().values()),
    destroyedAt: new Set(db.getDestroyedActors?.().values()),
    numbering: { visible: false, next: 1, step: 1 },
    activatedByMessage: undefined,
  };
  const steps = messages
    .map((message, index) =>
      readSequenceStep(message, lineTypes.get(message.type) ?? "", index, context),
    )
    .filter((step) => step !== null);

  return {
    kind: "sequence",
    heading: readHeading(source, db.getDiagramTitle?.() ?? ""),
    actors,
    boxes: (db.getBoxes?.() ?? []).map((box) => ({ label: box.name ?? "", keys: box.actorKeys })),
    steps,
  };
}

export function readDiagram(
  type: string,
  db: unknown,
  source: string,
): GraphModel | SequenceModel | null {
  const mermaidDb = db as MermaidDb;
  if (type.startsWith("flowchart")) {
    return readFlowchart(mermaidDb, source);
  }
  if (type === "stateDiagram" || type === "state") {
    return readStateDiagram(mermaidDb, source);
  }
  return type === "sequence" ? readSequence(mermaidDb, source) : null;
}
