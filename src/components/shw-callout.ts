import { css, html, LitElement, nothing } from "lit";

import { defineElement } from "../internal/define-element";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import { headingStyles, hostStyles } from "../styles/component-styles";
import type { ShwTone } from "../shw-tone";
import "./shw-markdown";

/**
 * Highlights a short Markdown message.
 *
 * @element shw-callout
 */
export class ShwCallout extends LitElement {
  public static override properties = {
    heading: { type: String },
    tone: { type: String, reflect: true },
  };

  public static override styles = [
    hostStyles,
    headingStyles,
    css`
      :host {
        --shw-callout-accent: var(--shw-color-accent, #4f46e5);
        --shw-callout-background: var(--shw-color-accent-soft, #eef2ff);
        display: block;
      }

      :host([tone="success"]) {
        --shw-callout-accent: var(--shw-tone-success, #16835a);
        --shw-callout-background: var(--shw-tone-success-soft, #ecfdf3);
      }

      :host([tone="warning"]) {
        --shw-callout-accent: var(--shw-tone-warning, #b54708);
        --shw-callout-background: var(--shw-tone-warning-soft, #fffaeb);
      }

      :host([tone="danger"]) {
        --shw-callout-accent: var(--shw-tone-danger, #c4320a);
        --shw-callout-background: var(--shw-tone-danger-soft, #fff1f0);
      }

      :host([tone="neutral"]) {
        --shw-callout-accent: var(--shw-tone-neutral, #475467);
        --shw-callout-background: var(--shw-tone-neutral-soft, #f8fafc);
      }

      aside {
        background: var(--shw-callout-background);
        border: 1px solid color-mix(in srgb, var(--shw-callout-accent) 24%, transparent);
        border-left: 0.3rem solid var(--shw-callout-accent);
        border-radius: 0.75rem;
        display: grid;
        gap: 0.45rem;
        padding: 1rem 1.15rem;
      }

      .heading {
        color: var(--shw-callout-accent);
        font-size: 0.95rem;
      }

      shw-markdown {
        --shw-reading-width: none;
      }
    `,
  ];

  /** Optional callout heading. */
  public heading = "";

  /** Visual meaning of the callout. */
  public tone: ShwTone = "info";

  readonly #content = new LightDomTextController(this);

  protected override render() {
    return html`
      <aside>
        ${this.heading === "" ? nothing : html`<h3 class="heading">${this.heading}</h3>`}
        <shw-markdown>${this.#content.source}</shw-markdown>
      </aside>
    `;
  }
}

defineElement("shw-callout", ShwCallout);

declare global {
  interface HTMLElementTagNameMap {
    "shw-callout": ShwCallout;
  }
}
