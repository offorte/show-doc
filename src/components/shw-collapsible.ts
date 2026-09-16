import { html, LitElement, unsafeCSS } from "lit";

import { defineElement } from "../internal/define-element";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import disclosureStyles from "../styles/collapsible.css?inline";
import { hostStyles } from "../styles/component-styles";
import "./shw-markdown";

/**
 * Hides optional Markdown or child document blocks behind a native disclosure control.
 *
 * @element shw-collapsible
 * @slot - Document blocks when content="blocks".
 */
export class ShwCollapsible extends LitElement {
  public static override properties = {
    content: { type: String },
    open: { type: Boolean, reflect: true },
    summary: { type: String },
  };

  public static override styles = [hostStyles, unsafeCSS(disclosureStyles)];

  /** Whether the disclosure starts open. */
  public open = false;

  /** Label for the disclosure control. */
  public summary = "Details";

  /** Body input: Markdown text by default, or slotted document blocks. */
  public content: "markdown" | "blocks" = "markdown";

  readonly #content = new LightDomTextController(this);

  protected override render() {
    return html`
      <details ?open=${this.open} @toggle=${this.#handleToggle}>
        <summary>${this.summary}</summary>
        <div class="content">
          ${
            this.content === "blocks"
              ? html`<slot></slot>`
              : html`<shw-markdown>${this.#content.source}</shw-markdown>`
          }
        </div>
      </details>
    `;
  }

  #handleToggle(event: Event): void {
    const details = event.currentTarget;

    if (details instanceof HTMLDetailsElement && this.open !== details.open) {
      this.open = details.open;
    }
  }
}

defineElement("shw-collapsible", ShwCollapsible);

declare global {
  interface HTMLElementTagNameMap {
    "shw-collapsible": ShwCollapsible;
  }
}
