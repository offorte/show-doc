import { css, html, LitElement, nothing } from "lit";

import { defineElement } from "../internal/define-element";
import { hostStyles } from "../styles/component-styles";

/**
 * Frames an image, SVG, or diagram with an optional caption.
 *
 * @element shw-figure
 * @slot - The image, SVG, or diagram.
 */
export class ShwFigure extends LitElement {
  public static override properties = {
    caption: { type: String },
  };

  public static override styles = [
    hostStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }

      figure {
        margin: 0;
      }

      .media {
        align-items: center;
        background: var(--shw-color-surface-muted, #f8fafc);
        border: 1px solid var(--shw-color-border, #dde2ea);
        border-radius: 0.8rem;
        display: flex;
        justify-content: center;
        min-height: 4rem;
        overflow: hidden;
        padding: clamp(0.75rem, 2vw, 1.25rem);
      }

      ::slotted(img),
      ::slotted(svg),
      ::slotted(shw-mermaid) {
        display: block;
        height: auto;
        max-width: 100%;
      }

      figcaption {
        color: var(--shw-color-muted, #667085);
        font-size: 0.84rem;
        line-height: 1.55;
        margin-top: 0.65rem;
        text-align: center;
      }
    `,
  ];

  /** Optional plain-text caption below the visual. */
  public caption = "";

  protected override render() {
    return html`
      <figure>
        <div class="media"><slot></slot></div>
        ${this.caption === "" ? nothing : html`<figcaption>${this.caption}</figcaption>`}
      </figure>
    `;
  }
}

defineElement("shw-figure", ShwFigure);

declare global {
  interface HTMLElementTagNameMap {
    "shw-figure": ShwFigure;
  }
}
