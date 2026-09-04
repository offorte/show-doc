export interface ShowDocTable {
  headers: string[];
  rows: string[][];
}

function splitRow(line: string): string[] {
  const cells = line
    .trim()
    .split(/(?<!\\)\|/u)
    .map((cell) => cell.replaceAll("\\|", "|").trim());
  const firstCell = cells[0] === "" ? 1 : 0;
  const lastCell = cells.at(-1) === "" ? -1 : undefined;

  return cells.slice(firstCell, lastCell);
}

function isDividerRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell));
}

function removeDividerRow(rows: string[][]): string[][] {
  const candidate = rows[0];

  return candidate !== undefined && isDividerRow(candidate) ? rows.slice(1) : rows;
}

export function parseTable(source: string): ShowDocTable {
  const parsedRows = source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(splitRow)
    .filter((row) => row.length > 0);

  const firstRow = parsedRows.shift();

  if (firstRow === undefined) {
    return { headers: [], rows: [] };
  }

  const dataRows = removeDividerRow(parsedRows);
  const columnCount = Math.max(firstRow.length, ...dataRows.map((row) => row.length));
  const headers = Array.from(
    { length: columnCount },
    (_, index) => firstRow[index] ?? `Column ${index + 1}`,
  );
  const rows = dataRows.map((row) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? ""),
  );

  return { headers, rows };
}
