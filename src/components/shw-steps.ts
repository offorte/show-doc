import { css, html, LitElement } from "lit";

import { defineElement } from "../internal/define-element";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import { parseSteps } from "../internal/parse-steps";
import { hostStyles } from "../styles/component-styles";
import "./shw-markdown";

/**
 * Turns a compact numbered Markdown list into a visual sequence.
 *
 * @element shw-steps
 */
export class ShwSteps extends LitElement {
  public static override styles = [
    hostStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }

      ol {
        display: grid;
        gap: 1rem;
        list-style: none;
        margin: 0;
        padding: 0;
      }

      li {
        display: grid;
        gap: 0.85rem;
        grid-template-columns: 2rem minmax(0, 1fr);
        position: relative;
      }

      .marker {
        align-items: center;
        background: var(--shw-color-accent, #4f46e5);
        border-radius: 50%;
        color: var(--shw-color-on-accent, #ffffff);
        display: flex;
        font-size: 0.78rem;
        font-weight: 750;
        height: 2rem;
        justify-content: center;
        line-height: 1;
        position: relative;
        width: 2rem;
        z-index: 1;
      }

      li:not(:last-child)::after {
        background: var(--shw-color-border, #dde2ea);
        content: "";
        height: calc(100% + 1rem);
        left: calc(1rem - 0.5px);
        position: absolute;
        top: 2rem;
        width: 1px;
      }

      shw-markdown {
        --shw-reading-width: none;
        padding-top: 0.08rem;
      }
    `,
  ];

  readonly #content = new LightDomTextController(this);

  protected override render() {
    const steps = parseSteps(this.#content.source);

    return html`
      <ol>
        ${steps.map(
          (step, index) => html`
            <li>
              <span class="marker" aria-hidden="true">${index + 1}</span>
              <shw-markdown>${step}</shw-markdown>
            </li>
          `,
        )}
      </ol>
    `;
  }
}

defineElement("shw-steps", ShwSteps);

declare global {
  interface HTMLElementTagNameMap {
    "shw-steps": ShwSteps;
  }
}
