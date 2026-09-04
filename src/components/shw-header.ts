import { css, html, LitElement, nothing } from "lit";

import { defineElement } from "../internal/define-element";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import { headingStyles, hostStyles } from "../styles/component-styles";
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

  public static override styles = [
    hostStyles,
    headingStyles,
    css`
      :host {
        display: block;
      }

      header {
        border-bottom: 1px solid var(--shw-color-border, #dde2ea);
        padding-bottom: clamp(1.5rem, 4vw, 3rem);
      }

      .eyebrow {
        color: var(--shw-color-accent, #4f46e5);
        font-size: 0.75rem;
        font-weight: 750;
        letter-spacing: 0.12em;
        margin: 0 0 0.75rem;
        text-transform: uppercase;
      }

      .heading {
        font-size: clamp(2.25rem, 7vw, 4.75rem);
        max-width: 16ch;
      }

      shw-markdown {
        margin-top: 1.25rem;
        --shw-reading-width: 62ch;
      }
    `,
  ];

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
