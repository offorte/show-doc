import { html, LitElement, nothing, unsafeCSS } from "lit";

import { defineElement } from "../internal/define-element";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import { headingStyles, hostStyles } from "../styles/component-styles";
import headerStyles from "../styles/header.css?inline";
import "./shw-markdown";

/**
 * Renders a document title and an optional Markdown introduction.
 *
 * @element shw-header
 */
export class ShwHeader extends LitElement {
  public static override properties = {
    eyebrow: { type: String },
    heading: { type: String },
  };

  public static override styles = [hostStyles, headingStyles, unsafeCSS(headerStyles)];

  /** Short label above the main heading. */
  public eyebrow = "";

  /** Main document heading. */
  public heading = "";

  readonly #content = new LightDomTextController(this);

  protected override render() {
    return html`
      <header>
        ${this.eyebrow === "" ? nothing : html`<p class="eyebrow">${this.eyebrow}</p>`}
        <h1 class="heading">${this.heading}</h1>
        ${
          this.#content.source === ""
            ? nothing
            : html`<shw-markdown>${this.#content.source}</shw-markdown>`
        }
      </header>
    `;
  }
}

defineElement("shw-header", ShwHeader);

declare global {
  interface HTMLElementTagNameMap {
    "shw-header": ShwHeader;
  }
}
