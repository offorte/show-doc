import { css, html, LitElement, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { defineElement } from "../internal/define-element";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import { renderMarkdown } from "../internal/render-markdown";
import { parseTable } from "../internal/table-parser";
import { hostStyles } from "../styles/component-styles";

/**
 * Renders pipe-separated light DOM text as a semantic table.
 *
 * @element shw-table
 */
export class ShwTable extends LitElement {
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

      .scroller {
        border: 1px solid var(--shw-color-border, #dde2ea);
        border-radius: 0.8rem;
        overflow-x: auto;
      }

      table {
        border-collapse: collapse;
        font-size: 0.925rem;
        line-height: 1.5;
        min-width: 100%;
        text-align: left;
      }

      caption {
        color: var(--shw-color-heading, #101827);
        font-size: 1rem;
        font-weight: 700;
        padding: 0.9rem 1rem;
        text-align: left;
      }

      th,
      td {
        border-top: 1px solid var(--shw-color-border, #dde2ea);
        padding: 0.75rem 1rem;
        vertical-align: top;
      }

      th {
        background: var(--shw-color-surface-muted, #f8fafc);
        color: var(--shw-color-heading, #101827);
        font-size: 0.78rem;
        font-weight: 750;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      tbody tr:nth-child(even) {
        background: var(--shw-color-table-stripe, rgb(248 250 252 / 58%));
      }

      td :where(p, ul, ol) {
        margin-block: 0 0.5rem;
      }

      td :where(p, ul, ol):last-child {
        margin-bottom: 0;
      }

      td :where(ul, ol) {
        padding-left: 1.2rem;
      }

      td :where(a) {
        color: var(--shw-color-accent, #4f46e5);
        text-decoration-thickness: 0.08em;
        text-underline-offset: 0.16em;
      }

      td :where(code) {
        background: var(--shw-color-inline-code, #f2f4f7);
        border-radius: 0.25rem;
        color: var(--shw-color-heading, #101827);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.85em;
        padding: 0.1em 0.3em;
      }

      .empty {
        color: var(--shw-color-muted, #667085);
        margin: 0;
        padding: 1rem;
      }

      @media (max-width: 40rem) {
        .scroller {
          overflow-x: hidden;
        }

        thead {
          clip-path: inset(50%);
          height: 1px;
          overflow: hidden;
          position: absolute;
          white-space: nowrap;
          width: 1px;
        }

        tbody,
        tr,
        td {
          display: block;
        }

        tbody tr {
          border-top: 1px solid var(--shw-color-border, #dde2ea);
          padding-block: 0.4rem;
        }

        td {
          border: 0;
          display: grid;
          gap: 0.75rem;
          grid-template-columns: minmax(6.5rem, 36%) 1fr;
          overflow-wrap: anywhere;
          padding-block: 0.55rem;
        }

        td::before {
          color: var(--shw-color-muted, #667085);
          content: attr(data-label);
          font-size: 0.72rem;
          font-weight: 750;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
      }
    `,
  ];

  /** Optional accessible table caption. */
  public caption = "";

  readonly #content = new LightDomTextController(this);

  protected override render() {
    const table = parseTable(this.#content.source);

    if (table.headers.length === 0) {
      return html`<div class="scroller"><p class="empty">No table data.</p></div>`;
    }

    const caption =
      this.caption === ""
        ? nothing
        : html`<caption>
            ${this.caption}
          </caption>`;
    return html`
      <div class="scroller">
        <table>
          ${caption}
          <thead>
            <tr>
              ${table.headers.map((header) => html`<th scope="col">${header}</th>`)}
            </tr>
          </thead>
          <tbody>
            ${table.rows.map(
              (row) => html`
                <tr>
                  ${row.map(
                    (cell, index) =>
                      html`<td data-label=${table.headers[index] ?? ""}>
                        ${unsafeHTML(renderMarkdown(cell))}
                      </td>`,
                  )}
                </tr>
              `,
            )}
          </tbody>
        </table>
      </div>
    `;
  }
}

defineElement("shw-table", ShwTable);

declare global {
  interface HTMLElementTagNameMap {
    "shw-table": ShwTable;
  }
}
