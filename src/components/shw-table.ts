import { html, LitElement, nothing, unsafeCSS } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { defineElement } from "../internal/define-element";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import { renderMarkdown } from "../internal/render-markdown";
import { parseTable } from "../internal/table-parser";
import { hostStyles } from "../styles/component-styles";
import tableStyles from "../styles/table.css?inline";

/**
 * Renders pipe-separated light DOM text as a semantic table.
 *
 * @element shw-table
 */
export class ShwTable extends LitElement {
  public static override properties = {
    caption: { type: String },
  };

  public static override styles = [hostStyles, unsafeCSS(tableStyles)];

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
