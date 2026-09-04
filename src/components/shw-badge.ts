import { css, html, LitElement } from "lit";

import { defineElement } from "../internal/define-element";
import { hostStyles } from "../styles/component-styles";
import type { ShwTone } from "../shw-tone";

/**
 * Shows a short status or category label.
 *
 * @element shw-badge
 * @slot - Short status or category text.
 */
export class ShwBadge extends LitElement {
  public static override properties = {
    tone: { type: String, reflect: true },
  };

  public static override styles = [
    hostStyles,
    css`
      :host {
        --shw-badge-accent: var(--shw-tone-neutral, #475467);
        --shw-badge-background: var(--shw-tone-neutral-soft, #f2f4f7);
        display: inline-block;
        max-width: 100%;
      }

      :host([tone="info"]) {
        --shw-badge-accent: var(--shw-tone-info, #175cd3);
        --shw-badge-background: var(--shw-tone-info-soft, #eff8ff);
      }

      :host([tone="success"]) {
        --shw-badge-accent: var(--shw-tone-success, #067647);
        --shw-badge-background: var(--shw-tone-success-soft, #ecfdf3);
      }

      :host([tone="warning"]) {
        --shw-badge-accent: var(--shw-tone-warning, #b54708);
        --shw-badge-background: var(--shw-tone-warning-soft, #fffaeb);
      }

      :host([tone="danger"]) {
        --shw-badge-accent: var(--shw-tone-danger, #b42318);
        --shw-badge-background: var(--shw-tone-danger-soft, #fef3f2);
      }

      span {
        align-items: center;
        background: var(--shw-badge-background);
        border: 1px solid color-mix(in srgb, var(--shw-badge-accent) 16%, transparent);
        border-radius: 999px;
        color: var(--shw-badge-accent);
        display: inline-flex;
        font-size: 0.7rem;
        font-weight: 750;
        gap: 0.38rem;
        letter-spacing: 0.055em;
        line-height: 1;
        max-width: 100%;
        padding: 0.35rem 0.58rem;
        text-transform: uppercase;
      }

      span::before {
        background: currentcolor;
        border-radius: 50%;
        content: "";
        flex: 0 0 auto;
        height: 0.38rem;
        width: 0.38rem;
      }

      slot {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ];

  /** Visual meaning of the badge. */
  public tone: ShwTone = "neutral";

  protected override render() {
    return html`<span><slot></slot></span>`;
  }
}

defineElement("shw-badge", ShwBadge);

declare global {
  interface HTMLElementTagNameMap {
    "shw-badge": ShwBadge;
  }
}
