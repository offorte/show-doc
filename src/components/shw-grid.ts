import { css, html, LitElement } from "lit";

import { defineElement } from "../internal/define-element";
import { hostStyles } from "../styles/component-styles";

/**
 * Arranges child blocks in one to four responsive columns.
 *
 * @element shw-grid
 * @slot - The blocks arranged by the grid.
 */
export class ShwGrid extends LitElement {
  public static override properties = {
    columns: { type: Number, reflect: true },
  };

  public static override styles = [
    hostStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }

      .grid {
        display: grid;
        gap: clamp(1rem, 3vw, 1.75rem);
        grid-template-columns: 1fr;
      }

      ::slotted(*) {
        min-width: 0;
      }

      @media (min-width: 44rem) {
        .columns-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .columns-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .columns-4 {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (min-width: 68rem) {
        .columns-4 {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
    `,
  ];

  /** Number of columns. Supported values are 1, 2, 3, and 4. */
  public columns: 1 | 2 | 3 | 4 = 2;

  protected override render() {
    const columns = Math.min(
      4,
      Math.max(1, Number.isFinite(this.columns) ? Math.trunc(this.columns) : 2),
    );

    return html`<div class="grid columns-${columns}"><slot></slot></div>`;
  }
}

defineElement("shw-grid", ShwGrid);

declare global {
  interface HTMLElementTagNameMap {
    "shw-grid": ShwGrid;
  }
}
