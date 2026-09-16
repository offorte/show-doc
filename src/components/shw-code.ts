import { html, LitElement, nothing, unsafeCSS } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { classifyDiffLines, parseCodeDetails } from "../internal/code-details";
import { defineElement } from "../internal/define-element";
import { highlightCode, highlightCodeLines } from "../internal/highlight-code";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import codeStyles from "../styles/code.css?inline";
import { hostStyles } from "../styles/component-styles";
import "./shw-markdown";

type CodeDetails = ReturnType<typeof parseCodeDetails>;

function annotationMarkers(notes: CodeDetails["notes"]): Map<number, number[]> {
  const markers = new Map<number, number[]>();
  for (const [index, note] of notes.entries()) {
    const lineMarkers = markers.get(note.start) ?? [];
    lineMarkers.push(index + 1);
    markers.set(note.start, lineMarkers);
  }
  return markers;
}

/**
 * Shows code or a supplied unified diff, with optional source line numbers and notes.
 *
 * @element shw-code
 */
export class ShwCode extends LitElement {
  public static override properties = {
    filename: { type: String },
    language: { type: String },
    lineNumbers: { type: Boolean, attribute: "line-numbers" },
    highlight: { type: String },
    annotations: { type: String },
  };

  public static override styles = [hostStyles, unsafeCSS(codeStyles)];

  /** Optional filename shown above the code. */
  public filename = "";

  /** Syntax language: html, js, ts, json, or diff for a supplied unified diff. */
  public language = "text";

  /** Show 1-based positions in the displayed source, including diff headers. */
  public lineNumbers = false;

  /** Source lines to emphasize, for example 2,4-6. */
  public highlight = "";

  /** JSON array of { start, end?, text } notes. Text is safe Markdown; lines are 1-based. */
  public annotations = "";

  readonly #content = new LightDomTextController(this);

  protected override render() {
    const source = this.#content.source;
    const showLines = this.#usesLines();
    const lines = showLines
      ? highlightCodeLines(source, this.language === "diff" ? "text" : this.language)
      : [];
    const details = parseCodeDetails(this.highlight, this.annotations, lines.length);
    const sourceLines = this.lineNumbers || details.notes.length + details.ranges.length > 0;

    return html`<figure>
      ${this.#renderCaption(showLines, sourceLines)}
      ${this.#renderCode(source, showLines, lines, details)}
      ${details.errors.map((error) => html`<p class="error" role="alert">${error}</p>`)}
      ${this.#renderNotes(details.notes)}
    </figure>`;
  }

  #usesLines(): boolean {
    return (
      this.lineNumbers ||
      this.language === "diff" ||
      this.highlight !== "" ||
      this.annotations !== ""
    );
  }

  #renderCaption(showLines: boolean, sourceLines: boolean) {
    if (this.filename === "" && this.language === "text" && !showLines) {
      return nothing;
    }
    return html`<figcaption>
      <span>${this.filename}</span>
      ${this.#renderLanguage(sourceLines)}
    </figcaption>`;
  }

  #renderLanguage(sourceLines: boolean) {
    return html`<span class="caption-meta"
      >${sourceLines ? html`<span>Source lines</span>` : nothing}<span class="language"
        >${this.language}</span
      ></span
    >`;
  }

  #renderCode(source: string, showLines: boolean, lines: string[], details: CodeDetails) {
    if (!showLines) {
      return html`<pre><code>${unsafeHTML(highlightCode(source, this.language))}</code></pre>`;
    }
    const kinds = this.language === "diff" ? classifyDiffLines(source.split("\n")) : [];
    const markers = annotationMarkers(details.notes);
    return html`<pre><code class=${this.lineNumbers ? "lines numbered" : "lines"} style=${`--code-number-width: ${Math.max(2, String(lines.length).length)}ch`}>${lines.map((line, index) => this.#renderLine(line, index + 1, details.ranges, kinds[index] ?? "", markers.get(index + 1) ?? [], index === lines.length - 1))}</code></pre>`;
  }

  #renderLine(
    line: string,
    number: number,
    ranges: CodeDetails["ranges"],
    kind: string,
    markers: number[],
    last: boolean,
  ) {
    const focused = ranges.some((range) => number >= range.start && number <= range.end);
    return html`<span class=${`code-line ${kind}${focused ? " focused" : ""}`}
        >${this.lineNumbers ? html`<span class="line-number" data-number=${number} aria-hidden="true"></span>` : nothing}<span
          class="code-source"
          >${unsafeHTML(line)}</span
        ><span class="note-markers" aria-hidden="true"
          >${markers.map((marker) => html`<span class="note-marker" data-number=${marker}></span>`)}</span
        ></span
      >${last ? nothing : "\n"}`;
  }

  #renderNotes(notes: CodeDetails["notes"]) {
    if (notes.length === 0) {
      return nothing;
    }
    return html`<div class="notes">
      <ol aria-label="Code annotations">
        ${notes.map((note) => html`<li><span class="note-lines">Source ${note.start === note.end ? `line ${note.start}` : `lines ${note.start}–${note.end}`}</span><shw-markdown>${note.text}</shw-markdown></li>`)}
      </ol>
    </div>`;
  }
}

defineElement("shw-code", ShwCode);

declare global {
  interface HTMLElementTagNameMap {
    "shw-code": ShwCode;
  }
}
