import { sizeNode, type Measure } from "./measure";
import { outerTracks, placeEdges, TRACK, type Tracks } from "./route-edges";
import type { BlockCell, BlockModel, Box, GraphLayout, PlacedGroup, PlacedNode } from "./types";

const MARGIN = 24;
const GAP_X = 48;
const GAP_Y = 36;
const GROUP_PADDING = 18;
const GROUP_TOP = 46;

interface Slot {
  cell: BlockCell;
  span: number;
  row: number;
  column: number;
}

interface Packed {
  columns: number;
  rows: number;
  slots: Slot[];
}

interface Size {
  w: number;
  h: number;
}

function pack(cells: BlockCell[], columns: number): Packed {
  const width =
    columns > 0
      ? columns
      : Math.max(
          1,
          cells.reduce((sum, c) => sum + c.span, 0),
        );
  let row = 0;
  let column = 0;
  const slots = cells.map((cell) => {
    const span = Math.min(cell.span, width);
    if (column + span > width) {
      row += 1;
      column = 0;
    }
    const slot = { cell, span, row, column };
    column += span;
    return slot;
  });
  return { columns: width, rows: slots.length === 0 ? 0 : row + 1, slots };
}

function groupInset(label: string): { top: number; side: number; bottom: number } {
  return {
    top: label === "" ? GROUP_PADDING : GROUP_TOP,
    side: GROUP_PADDING,
    bottom: GROUP_PADDING,
  };
}

export function layoutBlocks(model: BlockModel, measure: Measure): GraphLayout {
  const sized = new Map(model.nodes.map((node) => [node.id, sizeNode(node, node.icon, measure)]));
  const nodeById = new Map(model.nodes.map((node) => [node.id, node]));
  const groupById = new Map(model.groups.map((group) => [group.id, group]));
  const naturalSizes = new Map<BlockCell, Size>();

  // With onlyCards, a row is as tall as its tallest card, so a group does not stretch the cards.
  const rowHeights = (packed: Packed, onlyCards = false): number[] => {
    const heights = Array.from({ length: packed.rows }, () => 0);
    for (const slot of packed.slots) {
      const h = onlyCards && slot.cell.kind !== "node" ? 0 : natural(slot.cell).h;
      heights[slot.row] = Math.max(heights[slot.row]!, h);
    }
    return heights;
  };

  const gridSize = (cells: BlockCell[], columns: number): Size => {
    const packed = pack(cells, columns);
    const cellWidth = Math.max(
      0,
      ...packed.slots.map((slot) => (natural(slot.cell).w - GAP_X * (slot.span - 1)) / slot.span),
    );
    const heights = rowHeights(packed);
    return {
      w: packed.columns * cellWidth + (packed.columns - 1) * GAP_X,
      h: heights.reduce((sum, h) => sum + h, 0) + Math.max(0, packed.rows - 1) * GAP_Y,
    };
  };

  function natural(cell: BlockCell): Size {
    const known = naturalSizes.get(cell);
    if (known !== undefined) {
      return known;
    }
    let size: Size = { w: 0, h: 0 };
    if (cell.kind === "node") {
      const node = sized.get(cell.id);
      size = { w: node?.w ?? 0, h: node?.h ?? 0 };
    } else if (cell.kind === "group") {
      const label = groupById.get(cell.id)?.label ?? "";
      const inset = groupInset(label);
      const inner = gridSize(cell.cells, cell.columns);
      const title = label === "" ? 0 : measure.groupTitle(label);
      size = {
        w: Math.max(inner.w, title) + inset.side * 2,
        h: inner.h + inset.top + inset.bottom,
      };
    }
    naturalSizes.set(cell, size);
    return size;
  }

  const nodes: PlacedNode[] = [];
  const groups: PlacedGroup[] = [];
  const tracks: Tracks = { xs: [], ys: [] };

  const addGapTracks = (area: Box, columns: number, cellWidth: number, rowTops: number[]): void => {
    for (let column = 1; column < columns; column += 1) {
      const gap = area.x + column * (cellWidth + GAP_X) - GAP_X / 2;
      tracks.xs.push(gap - TRACK, gap, gap + TRACK);
    }
    for (const top of rowTops.slice(1)) {
      const gap = top - GAP_Y / 2;
      tracks.ys.push(gap - TRACK, gap, gap + TRACK);
    }
  };

  const placeCell = (cell: BlockCell, box: Box, cardHeight: number): void => {
    if (cell.kind === "space") {
      return;
    }
    if (cell.kind === "node") {
      const node = nodeById.get(cell.id);
      const size = sized.get(cell.id);
      if (node !== undefined && size !== undefined) {
        nodes.push({ ...node, ...size, ...box, h: cardHeight });
      }
      return;
    }
    const group = groupById.get(cell.id);
    if (group === undefined) {
      return;
    }
    groups.push({ ...group, ...box, lane: false });
    const inset = groupInset(group.label);
    place(cell.cells, cell.columns, {
      x: box.x + inset.side,
      y: box.y + inset.top,
      w: box.w - inset.side * 2,
      h: box.h - inset.top - inset.bottom,
    });
  };

  function place(cells: BlockCell[], columns: number, area: Box): void {
    const packed = pack(cells, columns);
    const cellWidth = (area.w - (packed.columns - 1) * GAP_X) / packed.columns;
    const heights = rowHeights(packed);
    const cardHeights = rowHeights(packed, true);
    const rowTops = heights.map((_, row) =>
      heights.slice(0, row).reduce((top, h) => top + h + GAP_Y, area.y),
    );
    addGapTracks(area, packed.columns, cellWidth, rowTops);
    for (const slot of packed.slots) {
      const box = {
        x: area.x + slot.column * (cellWidth + GAP_X),
        y: rowTops[slot.row]!,
        w: slot.span * cellWidth + (slot.span - 1) * GAP_X,
        h: heights[slot.row]!,
      };
      placeCell(slot.cell, box, cardHeights[slot.row]!);
    }
  }

  const content = gridSize(model.cells, model.columns);
  place(model.cells, model.columns, { x: MARGIN, y: MARGIN, w: content.w, h: content.h });
  const width = content.w + MARGIN * 2;
  const height = content.h + MARGIN * 2;
  const outer = outerTracks({ width, height }, MARGIN);
  tracks.xs.push(...outer.xs);
  tracks.ys.push(...outer.ys);

  const ends = new Map<string, Box>([
    ...groups.map((group) => [group.id, group] as const),
    ...nodes.map((node) => [node.id, node] as const),
  ]);
  const visible = model.edges.filter(
    (edge) => !edge.hidden && ends.has(edge.from) && ends.has(edge.to),
  );
  const edges = placeEdges(visible, ends, nodes, tracks, measure);
  return { kind: "graph", heading: model.heading, width, height, groups, nodes, edges };
}
