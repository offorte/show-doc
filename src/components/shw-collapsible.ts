import { css, html, LitElement } from "lit";

import { defineElement } from "../internal/define-element";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import { hostStyles } from "../styles/component-styles";
import "./shw-markdown";

/**
 * Hides optional Markdown details behind a native disclosure control.
 *
 * @element shw-collapsible
 */
export class ShwCollapsible extends LitElement {
  public static override properties = {
    open: { type: Boolean, reflect: true },
    summary: { type: String },
  };

  public static override styles = [
    hostStyles,
    css`
      :host {
        display: block;
      }

      details {
        background: color-mix(
          in srgb,
          var(--shw-color-surface, #ffffff) 82%,
          var(--shw-color-surface-muted, #f8fafc)
        );
        border: 1px solid var(--shw-color-border, #dde2ea);
        border-radius: 0.8rem;
        overflow: clip;
      }

      summary {
        align-items: center;
        color: var(--shw-color-heading, #101827);
        cursor: pointer;
        display: flex;
        font-weight: 700;
        gap: 0.75rem;
        line-height: 1.4;
        list-style: none;
        padding: 1rem 1.15rem;
        user-select: none;
      }

      summary::-webkit-details-marker {
        display: none;
      }

      summary::before {
        border-bottom: 0.12rem solid currentcolor;
        border-right: 0.12rem solid currentcolor;
        content: "";
        flex: 0 0 auto;
        height: 0.45rem;
        margin-left: 0.15rem;
        transform: rotate(-45deg);
        transition: transform 160ms ease;
        width: 0.45rem;
      }

      details[open] summary::before {
        transform: rotate(45deg) translate(-0.1rem, -0.1rem);
      }

      summary:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--shw-color-accent, #4f46e5) 30%, transparent);
        outline-offset: -3px;
      }

      .content {
        border-top: 1px solid var(--shw-color-border, #dde2ea);
        padding: 1rem 1.15rem 1.15rem;
      }

      shw-markdown {
        --shw-reading-width: none;
      }

      @media (prefers-reduced-motion: reduce) {
        summary::before {
          transition: none;
        }
      }
    `,
  ];

  /** Whether the disclosure starts open. */
  public open = false;

  /** Label for the disclosure control. */
  public summary = "Details";

  readonly #content = new LightDomTextController(this);

  protected override render() {
    return html`
      <details ?open=${this.open} @toggle=${this.#handleToggle}>
        <summary>${this.summary}</summary>
        <div class="content">
          <shw-markdown>${this.#content.source}</shw-markdown>
        </div>
      </details>
    `;
  }

  #handleToggle(event: Event): void {
    const details = event.currentTarget;

    if (details instanceof HTMLDetailsElement && this.open !== details.open) {
      this.open = details.open;
    }
  }
}

defineElement("shw-collapsible", ShwCollapsible);

declare global {
  interface HTMLElementTagNameMap {
    "shw-collapsible": ShwCollapsible;
  }
}
