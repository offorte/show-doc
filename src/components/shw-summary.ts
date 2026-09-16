import { html, LitElement, nothing, unsafeCSS } from "lit";

import { defineElement } from "../internal/define-element";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import { headingStyles, hostStyles } from "../styles/component-styles";
import summaryStyles from "../styles/summary.css?inline";
import "./shw-markdown";

/**
 * Presents a short Markdown overview before the document details.
 *
 * @element shw-summary
 */
export class ShwSummary extends LitElement {
  public static override properties = {
    heading: { type: String },
  };

  public static override styles = [hostStyles, headingStyles, unsafeCSS(summaryStyles)];

  /** Short label above the overview. */
  public heading = "Summary";

  readonly #content = new LightDomTextController(this);

  protected override render() {
    return html`
      <section>
        ${this.heading === "" ? nothing : html`<h2 class="heading">${this.heading}</h2>`}
        <shw-markdown>${this.#content.source}</shw-markdown>
      </section>
    `;
  }
}

defineElement("shw-summary", ShwSummary);

declare global {
  interface HTMLElementTagNameMap {
    "shw-summary": ShwSummary;
  }
}
