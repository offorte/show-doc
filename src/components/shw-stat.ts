import { html, LitElement, nothing, unsafeCSS } from "lit";

import { defineElement } from "../internal/define-element";
import { hostStyles } from "../styles/component-styles";
import statStyles from "../styles/stat.css?inline";
import type { ShwTone } from "../shw-tone";

/**
 * Shows one prominent value with a label and optional change.
 *
 * @element shw-stat
 */
export class ShwStat extends LitElement {
  public static override properties = {
    change: { type: String },
    label: { type: String },
    tone: { type: String, reflect: true },
    value: { type: String },
  };

  public static override styles = [hostStyles, unsafeCSS(statStyles)];

  /** Optional short change or context below the value. */
  public change = "";

  /** Short description of the value. */
  public label = "";

  /** Visual meaning of the change. */
  public tone: ShwTone = "neutral";

  /** Prominent value. */
  public value = "";

  protected override render() {
    return html`
      <article>
        <p class="label">${this.label}</p>
        <p class="value">${this.value}</p>
        ${this.change === "" ? nothing : html`<p class="change">${this.change}</p>`}
      </article>
    `;
  }
}

defineElement("shw-stat", ShwStat);

declare global {
  interface HTMLElementTagNameMap {
    "shw-stat": ShwStat;
  }
}
