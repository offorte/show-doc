import { css, html, LitElement, nothing } from "lit";

import { defineElement } from "../internal/define-element";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import { headingStyles, hostStyles } from "../styles/component-styles";
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

  public static override styles = [
    hostStyles,
    headingStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }

      article {
        background: var(--shw-color-surface, #ffffff);
        border: 1px solid var(--shw-color-border, #dde2ea);
        border-radius: 0.85rem;
        box-shadow: 0 1px 2px var(--shw-color-shadow, rgb(15 23 42 / 3%));
        display: grid;
        gap: 0.8rem;
        height: 100%;
        padding: clamp(1rem, 3vw, 1.35rem);
      }

      .heading {
        font-size: 1.08rem;
        line-height: 1.35;
      }

      shw-badge {
        justify-self: start;
      }

      shw-markdown {
        --shw-reading-width: none;
      }
    `,
  ];

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
