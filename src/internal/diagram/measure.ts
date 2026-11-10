import type { GraphNode, IconName, PlacedNode } from "./types";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const NODE_HEIGHT = 56;
const LINE_HEIGHT = 18;
const CARD_PADDING = 12;
const CHIP_SPACE = 38;
const MAX_TITLE_WIDTH = 240;

export interface Measure {
  title(text: string): number;
  sub(text: string): number;
  label(text: string): number;
  groupTitle(text: string): number;
}

export function createMeasure(host: Element): Measure {
  const context = document.createElement("canvas").getContext("2d");
  const family = getComputedStyle(host).fontFamily;
  const width = (font: string, text: string): number => {
    if (context === null) {
      return text.length * 8;
    }
    context.font = font;
    return Math.ceil(context.measureText(text).width);
  };

  return {
    title: (text) => width(`600 13.5px ${family}`, text),
    sub: (text) => width(`11px ${MONO}`, text),
    label: (text) => width(`500 10.5px ${family}`, text),
    // Matches .lane-title: 700 11px, uppercase, 0.12em letter spacing.
    groupTitle: (text) =>
      width(`700 11px ${family}`, text.toUpperCase()) + Math.ceil(text.length * 11 * 0.12),
  };
}

function wrapText(text: string, maxWidth: number, widthOf: (part: string) => number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/u)) {
    const next = line === "" ? word : `${line} ${word}`;
    if (line !== "" && widthOf(next) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  lines.push(line);
  return lines;
}

export function labelSize(lines: string[], measure: Measure): { w: number; h: number } {
  return {
    w: Math.max(...lines.map((line) => measure.label(line))) + 16,
    h: 18 + (lines.length - 1) * 14,
  };
}

export function sizeNode(
  node: GraphNode,
  chip: IconName | undefined,
  measure: Measure,
): Pick<PlacedNode, "w" | "h" | "titleLines" | "chip"> {
  const titleLines = wrapText(node.title, MAX_TITLE_WIDTH, measure.title);
  const lines = titleLines.length + node.sub.length;
  const textWidth = Math.max(
    ...titleLines.map((line) => measure.title(line)),
    ...node.sub.map((line) => measure.sub(line)),
  );
  const textHeight = lines * LINE_HEIGHT;
  const fixed = { titleLines, chip: undefined };

  switch (node.shape) {
    case "start":
    case "end":
      return { ...fixed, titleLines: [], w: 20, h: 20 };
    case "choice":
      return { ...fixed, titleLines: [], w: 30, h: 30 };
    case "bar":
      return { ...fixed, titleLines: [], w: 72, h: 8 };
    case "decision":
      return { ...fixed, w: Math.max(120, textWidth + 72), h: Math.max(72, textHeight + 44) };
    case "circle": {
      const size = Math.max(64, Math.max(textWidth, textHeight) + 28);
      return { ...fixed, w: size, h: size };
    }
    case "terminal":
      return { ...fixed, w: Math.max(96, textWidth + 40), h: Math.max(44, textHeight + 20) };
    case "note":
      return { ...fixed, w: textWidth + 28, h: textHeight + 18 };
    case "card":
      return {
        titleLines,
        chip,
        w: Math.max(132, textWidth + CARD_PADDING * 2 + (chip === undefined ? 0 : CHIP_SPACE)),
        h: Math.max(chip === undefined ? 44 : NODE_HEIGHT, textHeight + 20),
      };
  }
}
