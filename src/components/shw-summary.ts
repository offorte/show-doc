import { css, html, LitElement, nothing } from "lit";

import { defineElement } from "../internal/define-element";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import { headingStyles, hostStyles } from "../styles/component-styles";
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

  public static override styles = [
    hostStyles,
    headingStyles,
    css`
      :host {
        display: block;
      }

      section {
        background: color-mix(
          in srgb,
          var(--shw-color-accent-soft, #eef2ff) 62%,
          var(--shw-color-surface, #ffffff)
        );
        border: 1px solid color-mix(in srgb, var(--shw-color-accent, #4f46e5) 18%, transparent);
        border-left: 0.3rem solid var(--shw-color-accent, #4f46e5);
        border-radius: 0.8rem;
        display: grid;
        gap: 0.55rem;
        padding: clamp(1rem, 3vw, 1.4rem);
      }

      .heading {
        color: var(--shw-color-accent, #4f46e5);
        font-size: 0.78rem;
        font-weight: 750;
        letter-spacing: 0.09em;
        text-transform: uppercase;
      }

      shw-markdown {
        --shw-reading-width: none;
      }
    `,
  ];

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
