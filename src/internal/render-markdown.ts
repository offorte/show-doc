import { micromark } from "micromark";
import { gfmStrikethrough, gfmStrikethroughHtml } from "micromark-extension-gfm-strikethrough";
import { gfmTaskListItem, gfmTaskListItemHtml } from "micromark-extension-gfm-task-list-item";

const extensions = [gfmStrikethrough(), gfmTaskListItem()];
const htmlExtensions = [gfmStrikethroughHtml(), gfmTaskListItemHtml()];

export function renderMarkdown(source: string): string {
  return micromark(source, { extensions, htmlExtensions });
}
