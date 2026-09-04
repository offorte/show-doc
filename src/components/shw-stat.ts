import { css, html, LitElement, nothing } from "lit";

import { defineElement } from "../internal/define-element";
import { hostStyles } from "../styles/component-styles";
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

  public static override styles = [
    hostStyles,
    css`
      :host {
        --shw-stat-accent: var(--shw-tone-neutral, #475467);
        display: block;
        min-width: 0;
      }

      :host([tone="info"]) {
        --shw-stat-accent: var(--shw-tone-info, #175cd3);
      }

      :host([tone="success"]) {
        --shw-stat-accent: var(--shw-tone-success, #067647);
      }

      :host([tone="warning"]) {
        --shw-stat-accent: var(--shw-tone-warning, #b54708);
      }

      :host([tone="danger"]) {
        --shw-stat-accent: var(--shw-tone-danger, #b42318);
      }

      article {
        background: var(--shw-color-surface, #ffffff);
        border: 1px solid var(--shw-color-border, #dde2ea);
        border-radius: 0.8rem;
        box-shadow: 0 1px 2px var(--shw-color-shadow, rgb(15 23 42 / 3%));
        display: grid;
        gap: 0.25rem;
        height: 100%;
        padding: clamp(1rem, 3vw, 1.35rem);
      }

      .label {
        color: var(--shw-color-muted, #667085);
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        margin: 0;
        text-transform: uppercase;
      }

      .value {
        color: var(--shw-color-heading, #101827);
        font-size: clamp(1.85rem, 5vw, 2.65rem);
        font-weight: 750;
        letter-spacing: -0.04em;
        line-height: 1.1;
        margin: 0.2rem 0 0;
        overflow-wrap: anywhere;
      }

      .change {
        color: var(--shw-stat-accent);
        font-size: 0.85rem;
        font-weight: 700;
        margin: 0.35rem 0 0;
      }
    `,
  ];

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
