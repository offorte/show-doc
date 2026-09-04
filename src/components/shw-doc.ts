import { css, html, LitElement } from "lit";

import { defineElement } from "../internal/define-element";
import { hostStyles } from "../styles/component-styles";

/**
 * Provides the page and document canvas for a ShowDoc artifact.
 *
 * @element shw-doc
 * @slot - The complete visible document.
 */
export class ShwDoc extends LitElement {
  public static override styles = [
    hostStyles,
    css`
      :host {
        background:
          radial-gradient(
            circle at 15% 0%,
            color-mix(in srgb, var(--shw-color-accent, #4f46e5) 8%, transparent),
            transparent 32rem
          ),
          var(--shw-color-page, #f3f5f8);
        display: block;
        min-height: 100vh;
        padding: clamp(1rem, 4vw, 4rem);
      }

      .document {
        background: var(--shw-color-surface, #ffffff);
        border: 1px solid color-mix(in srgb, var(--shw-color-border, #dde2ea) 88%, transparent);
        border-radius: var(--shw-radius, 1rem);
        box-shadow:
          0 1px 2px
            color-mix(in srgb, var(--shw-color-shadow, rgb(15 23 42 / 10%)) 40%, transparent),
          0 1.5rem 4rem var(--shw-color-shadow, rgb(15 23 42 / 10%));
        margin-inline: auto;
        max-width: var(--shw-content-width, 76rem);
        overflow: clip;
        padding: clamp(1.4rem, 5vw, 4.5rem);
      }

      slot {
        display: grid;
        gap: clamp(2rem, 5vw, 4.5rem);
      }

      @media (max-width: 40rem) {
        :host {
          padding: 0;
        }

        .document {
          border: 0;
          border-radius: 0;
          box-shadow: none;
        }
      }

      @media print {
        :host {
          background: #ffffff;
          min-height: auto;
          padding: 0;
        }

        .document {
          border: 0;
          box-shadow: none;
          max-width: none;
          padding: 0;
        }
      }
    `,
  ];

  protected override render() {
    return html`<main class="document"><slot></slot></main>`;
  }
}

defineElement("shw-doc", ShwDoc);

declare global {
  interface HTMLElementTagNameMap {
    "shw-doc": ShwDoc;
  }
}
