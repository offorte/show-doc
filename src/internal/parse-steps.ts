const stepMarker = /(?:^\s*|\s+)(\d+)[.)]\s+/gu;

function hasSequentialNumbers(markers: RegExpMatchArray[]): boolean {
  const firstNumber = Number(markers[0]?.[1]);

  return markers.every((marker, index) => Number(marker[1]) === firstNumber + index);
}

function sliceStepBodies(line: string, markers: RegExpMatchArray[]): string[] {
  return markers.map((marker, index) => {
    const start = (marker.index ?? 0) + marker[0].length;
    const end = markers[index + 1]?.index ?? line.length;
    return line.slice(start, end).trim();
  });
}

function readSteps(line: string): string[] | undefined {
  const markers = [...line.matchAll(stepMarker)];
  const [firstMarker] = markers;

  if (firstMarker?.index !== 0) {
    return undefined;
  }

  if (!hasSequentialNumbers(markers)) {
    return [line.slice(firstMarker[0].length)];
  }

  return sliceStepBodies(line, markers);
}

function appendContinuation(steps: string[], line: string): void {
  const previous = steps.pop();

  if (previous !== undefined) {
    steps.push(`${previous}\n${line}`.trimEnd());
  }
}

function keepSourceWhenUnnumbered(steps: string[], source: string): string[] {
  if (steps.length === 0 && source !== "") {
    return [source];
  }

  return steps;
}

export function parseSteps(source: string): string[] {
  const steps: string[] = [];

  for (const line of source.split("\n")) {
    const lineSteps = readSteps(line);

    if (lineSteps === undefined) {
      appendContinuation(steps, line);
    } else {
      steps.push(...lineSteps);
    }
  }

  return keepSourceWhenUnnumbered(steps, source);
}
