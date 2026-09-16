import { html, LitElement, nothing, unsafeCSS } from "lit";

import { defineElement } from "../internal/define-element";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import { headingStyles, hostStyles } from "../styles/component-styles";
import cardStyles from "../styles/card.css?inline";
import type { ShwTone } from "../shw-tone";
import "./shw-badge";
import "./shw-markdown";

/**
 * Groups one focused idea in a bordered card with an optional badge.
 *
 * @element shw-card
 */
export class ShwCard extends LitElement {
  public static override properties = {
    heading: { type: String },
    label: { type: String },
    tone: { type: String, reflect: true },
  };

  public static override styles = [hostStyles, headingStyles, unsafeCSS(cardStyles)];

  /** Optional card heading. */
  public heading = "";

  /** Optional short badge label above the heading. */
  public label = "";

  /** Visual meaning of the optional badge. */
  public tone: ShwTone = "neutral";

  readonly #content = new LightDomTextController(this);

  protected override render() {
    return html`
      <article>
        ${
          this.label === ""
            ? nothing
            : html`<shw-badge .tone=${this.tone}>${this.label}</shw-badge>`
        }
        ${this.heading === "" ? nothing : html`<h3 class="heading">${this.heading}</h3>`}
        ${
          this.#content.source === ""
            ? nothing
            : html`<shw-markdown>${this.#content.source}</shw-markdown>`
        }
      </article>
    `;
  }
}

defineElement("shw-card", ShwCard);

declare global {
  interface HTMLElementTagNameMap {
    "shw-card": ShwCard;
  }
}
