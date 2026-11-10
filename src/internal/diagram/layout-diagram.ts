import { layoutBlocks } from "./block-layout";
import { layoutWithElk } from "./elk-layout";
import { layoutLanes } from "./lane-layout";
import { createMeasure } from "./measure";
import { layoutSequence } from "./sequence-layout";
import type { DiagramLayout, DiagramModel } from "./types";

export async function layoutDiagram(model: DiagramModel, host: Element): Promise<DiagramLayout> {
  await document.fonts.ready;
  const measure = createMeasure(host);
  if (model.kind === "sequence") {
    return layoutSequence(model, measure);
  }
  if (model.kind === "block") {
    return layoutBlocks(model, measure);
  }
  return model.useLanes ? layoutLanes(model, measure) : layoutWithElk(model, measure);
}
