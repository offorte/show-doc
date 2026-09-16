type LineRange = { start: number; end: number };
type CodeAnnotation = LineRange & { text: string };

function validLine(line: unknown, lineCount: number): line is number {
  return typeof line === "number" && Number.isSafeInteger(line) && line >= 1 && line <= lineCount;
}

function codeRange(start: unknown, end: unknown, lineCount: number): LineRange | undefined {
  if (validLine(start, lineCount) && validLine(end, lineCount) && start <= end) {
    return { start, end };
  }
  return undefined;
}

function parseHighlights(source: string, lineCount: number): LineRange[] {
  if (source.trim() === "") {
    return [];
  }

  return source.split(",").map((entry) => {
    const [, start, end = start] = entry.trim().match(/^(\d+)(?:-(\d+))?$/u) ?? [];
    const range = codeRange(Number(start), Number(end), lineCount);

    if (range === undefined) {
      throw new Error(
        "Invalid highlight. Use source line numbers such as 2,4-6 within this code block.",
      );
    }
    return range;
  });
}

function annotationError(index: number): Error {
  return new Error(
    `Annotation ${index + 1} needs valid source line numbers (start and optional end) and nonempty text.`,
  );
}

function parseAnnotation(
  entry: Record<string, unknown>,
  index: number,
  lineCount: number,
): CodeAnnotation {
  const { start, end = start, text } = entry;
  const range = codeRange(start, end, lineCount);

  if (range === undefined || typeof text !== "string" || text.trim() === "") {
    throw annotationError(index);
  }

  return { ...range, text };
}

function parseAnnotations(source: string, lineCount: number): CodeAnnotation[] {
  if (source.trim() === "") {
    return [];
  }

  const entries: unknown = JSON.parse(source);
  if (!Array.isArray(entries)) {
    throw new Error("Annotations must be a JSON array.");
  }

  return entries.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw annotationError(index);
    }
    return parseAnnotation(entry, index, lineCount);
  });
}

export function parseCodeDetails(highlight: string, annotations: string, lineCount: number) {
  let ranges: LineRange[] = [];
  let notes: CodeAnnotation[] = [];
  const errors: string[] = [];

  try {
    ranges = parseHighlights(highlight, lineCount);
  } catch (error) {
    errors.push((error as Error).message);
  }

  try {
    notes = parseAnnotations(annotations, lineCount);
  } catch (error) {
    errors.push(
      error instanceof SyntaxError
        ? "Annotations must contain valid JSON."
        : (error as Error).message,
    );
  }

  return { ranges, notes, errors };
}

type DiffHunk = { old: number; next: number };

function parseDiffHunk(line: string): DiffHunk | undefined {
  const hunk = line.match(/^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/u);
  return hunk === null ? undefined : { old: Number(hunk[1] ?? 1), next: Number(hunk[2] ?? 1) };
}

function consumeDiffLine(line: string, remaining: DiffHunk): string | undefined {
  switch (line[0]) {
    case "+":
      remaining.next -= 1;
      return "added";
    case "-":
      remaining.old -= 1;
      return "removed";
    case " ":
      remaining.old -= 1;
      remaining.next -= 1;
      return "context";
    default:
      return undefined;
  }
}

function classifyDiffMetadata(line: string): string {
  if (/^(?:diff |index |--- |\+\+\+ |\\ No newline)/u.test(line)) {
    return "metadata";
  }
  return line.startsWith("+") ? "added" : line.startsWith("-") ? "removed" : "context";
}

/** Keep file headers distinct from added or removed lines inside a unified diff hunk. */
export function classifyDiffLines(lines: string[]): string[] {
  let remaining: DiffHunk = { old: 0, next: 0 };

  return lines.map((line) => {
    const hunk = parseDiffHunk(line);
    if (hunk !== undefined) {
      remaining = hunk;
      return "hunk";
    }

    if (Math.max(remaining.old, remaining.next) > 0) {
      return consumeDiffLine(line, remaining) ?? classifyDiffMetadata(line);
    }

    return classifyDiffMetadata(line);
  });
}
