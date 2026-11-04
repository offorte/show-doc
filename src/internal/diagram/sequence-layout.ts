import { labelSize, NODE_HEIGHT, type Measure } from "./measure";
import type {
  Box,
  PlacedActor,
  PlacedBlock,
  PlacedMessage,
  PlacedNote,
  SequenceLayout,
  SequenceModel,
  SequenceStep,
} from "./types";

const MARGIN = 24;
const ACTOR_GAP = 28;
const MIN_ACTOR_WIDTH = 132;
const SELF_LOOP_WIDTH = 34;
const SELF_LOOP_HEIGHT = 26;
const BLOCK_HEADER = 24;
const BLOCK_PADDING = 26;
const BLOCK_NEST = 10;
const BOX_TOP = 30;
const BAR_WIDTH = 10;

interface OpenBlock extends PlacedBlock {
  level: number;
  minX: number;
  maxX: number;
}

type MessageStep = Extract<SequenceStep, { type: "message" }>;

interface ActorSpan {
  from: number;
  to: number;
  need: number;
}

function noteSize(text: string[], measure: Measure): { w: number; h: number } {
  return {
    w: Math.max(...text.map((line) => measure.title(line) * 0.9), 40) + 24,
    h: text.length * 18 + 16,
  };
}

function messageSpan(
  step: Extract<SequenceStep, { type: "message" }>,
  indexOf: Map<string, number>,
  measure: Measure,
): ActorSpan {
  const a = indexOf.get(step.from) ?? 0;
  const b = indexOf.get(step.to) ?? 0;
  const need = labelSize(step.text, measure).w;
  return a === b
    ? { from: a, to: a + 1, need: need + SELF_LOOP_WIDTH + 16 }
    : { from: Math.min(a, b), to: Math.max(a, b), need: need + 36 };
}

function noteSpan(
  step: Extract<SequenceStep, { type: "note" }>,
  indexOf: Map<string, number>,
  measure: Measure,
): ActorSpan {
  const index = indexOf.get(step.from) ?? 0;
  const need = noteSize(step.text, measure).w + 20;
  return step.placement === "right"
    ? { from: index, to: index + 1, need }
    : { from: index - 1, to: index, need };
}

function collectSpans(model: SequenceModel, measure: Measure): ActorSpan[] {
  const indexOf = new Map(model.actors.map((actor, index) => [actor.key, index]));
  const spans: ActorSpan[] = [];
  for (const step of model.steps) {
    if (step.type === "message" && step.text.length > 0) {
      spans.push(messageSpan(step, indexOf, measure));
    } else if (step.type === "note" && step.placement !== "over") {
      spans.push(noteSpan(step, indexOf, measure));
    }
  }
  return spans.toSorted((a, b) => a.to - a.from - (b.to - b.from));
}

function widenGaps(gaps: number[], span: ActorSpan): void {
  const current = gaps.slice(span.from, span.to).reduce((sum, gap) => sum + gap, 0);
  if (current >= span.need) {
    return;
  }
  const extra = (span.need - current) / (span.to - span.from);
  for (let index = span.from; index < span.to; index += 1) {
    gaps[index] = gaps[index]! + extra;
  }
}

function actorCenters(model: SequenceModel, widths: number[], measure: Measure): number[] {
  const gaps = widths.slice(1).map((w, index) => (widths[index]! + w) / 2 + ACTOR_GAP);
  for (const span of collectSpans(model, measure)) {
    if (span.from >= 0 && span.to < widths.length) {
      widenGaps(gaps, span);
    }
  }
  let x = 0;
  return widths.map((_, index) => {
    if (index > 0) {
      x += gaps[index - 1]!;
    }
    return x;
  });
}

class SequenceWalker {
  public readonly messages: PlacedMessage[] = [];
  public readonly notes: PlacedNote[] = [];
  public readonly blocks: PlacedBlock[] = [];
  public readonly activations: Box[] = [];
  public readonly createdY = new Map<string, number>();
  public readonly destroyedY = new Map<string, number>();
  public y: number;

  readonly #openBlocks: OpenBlock[] = [];
  readonly #activeBars = new Map<string, { y: number; depth: number }[]>();
  readonly #centerOf: Map<string, number>;
  readonly #widthOf: Map<string, number>;
  readonly #centers: number[];
  readonly #measure: Measure;

  public constructor(
    model: SequenceModel,
    centers: number[],
    widths: number[],
    firstY: number,
    measure: Measure,
  ) {
    this.#centers = centers;
    this.#measure = measure;
    this.#centerOf = new Map(model.actors.map((actor, index) => [actor.key, centers[index]!]));
    this.#widthOf = new Map(model.actors.map((actor, index) => [actor.key, widths[index]!]));
    this.y = firstY;
  }

  public walk(step: SequenceStep): void {
    switch (step.type) {
      case "message":
        if (step.from === step.to) {
          this.#selfMessage(step);
        } else {
          this.#message(step);
        }
        break;
      case "note":
        this.#note(step);
        break;
      case "open":
        this.#openBlock(step);
        break;
      case "section":
        this.#section(step.text);
        break;
      case "close":
        this.#closeBlock();
        break;
      case "activate":
        this.#startBar(step.who, this.y);
        break;
      case "deactivate":
        this.#endBar(step.who, this.y);
        break;
    }
  }

  public finish(): void {
    this.y += 8;
    for (const [who, bars] of this.#activeBars) {
      while (bars.length > 0) {
        this.#endBar(who, this.y);
      }
    }
  }

  #center(who: string): number {
    return this.#centerOf.get(who) ?? 0;
  }

  #touch(left: number, right: number): void {
    for (const block of this.#openBlocks) {
      block.minX = Math.min(block.minX, left);
      block.maxX = Math.max(block.maxX, right);
    }
  }

  #edgeOf(who: string, side: number): number {
    const bars = this.#activeBars.get(who) ?? [];
    const offset = bars.length === 0 ? 0 : side * (BAR_WIDTH / 2 + (bars.length - 1) * 3);
    return this.#center(who) + offset;
  }

  #startBar(who: string, at: number): void {
    const bars = this.#activeBars.get(who) ?? [];
    bars.push({ y: at, depth: bars.length });
    this.#activeBars.set(who, bars);
  }

  #endBar(who: string, at: number): void {
    const bar = this.#activeBars.get(who)?.pop();
    if (bar !== undefined) {
      this.activations.push({
        x: this.#center(who) - BAR_WIDTH / 2 + bar.depth * 3,
        y: bar.y,
        w: BAR_WIDTH,
        h: Math.max(8, at - bar.y),
      });
    }
  }

  #selfMessage(step: MessageStep): void {
    const label = step.text.length > 0 ? labelSize(step.text, this.#measure) : undefined;
    const lineX = this.#edgeOf(step.from, 1);
    const top = this.y + 6;
    const right = lineX + SELF_LOOP_WIDTH;
    this.messages.push({
      ...messageLook(step),
      points: [
        { x: lineX, y: top },
        { x: right, y: top },
        { x: right, y: top + SELF_LOOP_HEIGHT },
        { x: lineX, y: top + SELF_LOOP_HEIGHT },
      ],
      labelBox:
        label === undefined
          ? undefined
          : { x: right + 8, y: top + SELF_LOOP_HEIGHT / 2 - label.h / 2, ...label },
    });
    this.#touch(this.#center(step.from), right + (label?.w ?? 0) + 8);
    this.y += SELF_LOOP_HEIGHT + 24;
  }

  #message(step: MessageStep): void {
    const label = step.text.length > 0 ? labelSize(step.text, this.#measure) : undefined;
    const fromCenter = this.#center(step.from);
    const toCenter = this.#center(step.to);
    const rowHeight = Math.max(step.creates ? NODE_HEIGHT + 10 : 0, (label?.h ?? 0) + 24);
    const lineY = this.y + rowHeight / 2;
    const direction = toCenter > fromCenter ? 1 : -1;
    if (step.activate) {
      this.#startBar(step.to, lineY);
    }
    const fromX = this.#edgeOf(step.from, direction);
    const toX = step.creates
      ? toCenter - (direction * (this.#widthOf.get(step.to) ?? 0)) / 2
      : this.#edgeOf(step.to, -direction);
    if (step.creates) {
      this.createdY.set(step.to, lineY - NODE_HEIGHT / 2);
    }
    if (step.destroys) {
      this.destroyedY.set(step.to, lineY);
    }
    this.messages.push({
      ...messageLook(step),
      points: [
        { x: fromX, y: lineY },
        { x: toX, y: lineY },
      ],
      labelBox:
        label === undefined
          ? undefined
          : { x: (fromX + toX) / 2 - label.w / 2, y: lineY - label.h / 2, ...label },
    });
    this.#touch(Math.min(fromCenter, toCenter), Math.max(fromCenter, toCenter));
    this.y += rowHeight;
  }

  #note(step: Extract<SequenceStep, { type: "note" }>): void {
    const size = noteSize(step.text, this.#measure);
    const box = this.#noteBox(step, size);
    this.notes.push({ ...box, text: step.text });
    this.#touch(box.x, box.x + box.w);
    this.y += size.h + 14;
  }

  #noteBox(step: Extract<SequenceStep, { type: "note" }>, size: { w: number; h: number }): Box {
    const from = this.#center(step.from);
    const top = this.y + 6;
    if (step.placement === "right") {
      return { x: from + 14, y: top, ...size };
    }
    if (step.placement === "left") {
      return { x: from - 14 - size.w, y: top, ...size };
    }
    const to = this.#center(step.to);
    const left = Math.min(from, to);
    const right = Math.max(from, to);
    const w = Math.max(size.w, right - left + 40);
    return { x: (left + right) / 2 - w / 2, y: top, w, h: size.h };
  }

  #openBlock(step: Extract<SequenceStep, { type: "open" }>): void {
    this.#openBlocks.push({
      block: step.block,
      text: step.text,
      textWidth: this.#measure.label(step.text) + 16,
      sections: [],
      x: 0,
      y: this.y + 4,
      w: 0,
      h: 0,
      level: 0,
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
    });
    this.y += step.block === "rect" ? 16 : BLOCK_HEADER;
  }

  #section(text: string): void {
    this.#openBlocks.at(-1)?.sections.push({
      y: this.y + 6,
      text,
      width: this.#measure.label(text) + 16,
    });
    this.y += BLOCK_HEADER;
  }

  #closeBlock(): void {
    const block = this.#openBlocks.pop();
    if (block === undefined) {
      return;
    }
    this.y += 8;
    const padding = BLOCK_PADDING + block.level * BLOCK_NEST;
    const hasContent = Number.isFinite(block.minX);
    const left = (hasContent ? block.minX : (this.#centers[0] ?? 0)) - padding;
    const right = (hasContent ? block.maxX : (this.#centers.at(-1) ?? 0)) + padding;
    const parent = this.#openBlocks.at(-1);
    if (parent !== undefined) {
      parent.level = Math.max(parent.level, block.level + 1);
    }
    this.#touch(left + BLOCK_PADDING, right - BLOCK_PADDING);
    this.blocks.push({
      block: block.block,
      text: block.text,
      textWidth: block.textWidth,
      sections: block.sections,
      x: left,
      y: block.y,
      w: right - left,
      h: this.y - block.y,
    });
    this.y += 12;
  }
}

function messageLook(step: MessageStep): Omit<PlacedMessage, "points" | "labelBox"> {
  return {
    text: step.text,
    dashed: step.dashed,
    head: step.head,
    both: step.both,
    number: step.number,
  };
}

function horizontalBounds(walker: SequenceWalker, boxes: Box[]): { minX: number; maxX: number } {
  const all: Box[] = [...boxes, ...walker.blocks, ...walker.notes];
  for (const message of walker.messages) {
    if (message.labelBox !== undefined) {
      all.push(message.labelBox);
    }
    for (const point of message.points) {
      all.push({ ...point, w: 0, h: 0 });
    }
  }
  return {
    minX: Math.min(...all.map((box) => box.x)),
    maxX: Math.max(...all.map((box) => box.x + box.w)),
  };
}

export function layoutSequence(model: SequenceModel, measure: Measure): SequenceLayout {
  const widths = model.actors.map((actor) =>
    Math.max(MIN_ACTOR_WIDTH, Math.max(...actor.label.map((line) => measure.title(line))) + 66),
  );
  const centers = actorCenters(model, widths, measure);
  const actorTop = model.boxes.length > 0 ? BOX_TOP : 0;
  const walker = new SequenceWalker(model, centers, widths, actorTop + NODE_HEIGHT + 22, measure);
  for (const step of model.steps) {
    walker.walk(step);
  }
  walker.finish();

  const bottom = walker.y + 8;
  const actors: PlacedActor[] = model.actors.map((actor, index) => {
    const w = widths[index]!;
    const top = walker.createdY.get(actor.key) ?? actorTop;
    return {
      key: actor.key,
      label: actor.label,
      icon: actor.icon,
      x: centers[index]! - w / 2,
      y: top,
      w,
      h: NODE_HEIGHT,
      lineTop: top + NODE_HEIGHT,
      lineBottom: walker.destroyedY.get(actor.key) ?? bottom,
      destroyed: walker.destroyedY.has(actor.key),
    };
  });
  const boxes = model.boxes.map((box) => {
    const members = actors.filter((actor) => box.keys.includes(actor.key));
    const left = Math.min(...members.map((actor) => actor.x)) - 14;
    const right = Math.max(...members.map((actor) => actor.x + actor.w)) + 14;
    return { label: box.label, x: left, y: 0, w: right - left, h: bottom + 8 };
  });

  const { minX, maxX } = horizontalBounds(walker, [...actors, ...boxes]);
  const dx = MARGIN - minX;
  const dy = MARGIN;
  const shift = <T extends Box>(box: T): T => ({ ...box, x: box.x + dx, y: box.y + dy });

  return {
    kind: "sequence",
    heading: model.heading,
    width: maxX - minX + 2 * MARGIN,
    height: bottom + 2 * MARGIN + 8,
    boxes: boxes.map(shift),
    actors: actors.map((actor) => ({
      ...shift(actor),
      lineTop: actor.lineTop + dy,
      lineBottom: actor.lineBottom + dy,
    })),
    activations: walker.activations.map(shift),
    blocks: walker.blocks.map((block) => ({
      ...shift(block),
      sections: block.sections.map((section) => ({ ...section, y: section.y + dy })),
    })),
    notes: walker.notes.map(shift),
    messages: walker.messages.map((message) => ({
      ...message,
      labelBox: message.labelBox === undefined ? undefined : shift(message.labelBox),
      points: message.points.map((point) => ({ x: point.x + dx, y: point.y + dy })),
    })),
  };
}
