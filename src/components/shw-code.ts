import { css, html, LitElement, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { defineElement } from "../internal/define-element";
import { highlightCode } from "../internal/highlight-code";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import { hostStyles } from "../styles/component-styles";

/**
 * Shows a syntax-highlighted code block with an optional filename.
 *
 * @element shw-code
 */
export class ShwCode extends LitElement {
  public static override properties = {
    filename: { type: String },
    language: { type: String },
  };

  public static override styles = [
    hostStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }

      figure {
        background: var(--shw-color-code-background, #111827);
        border: 1px solid var(--shw-color-code-border, rgb(255 255 255 / 12%));
        border-radius: 0.8rem;
        box-shadow: 0 0.75rem 2rem var(--shw-color-shadow, rgb(15 23 42 / 10%));
        color: var(--shw-color-code-text, #e6eaf2);
        margin: 0;
        overflow: hidden;
      }

      figcaption {
        align-items: center;
        background: var(--shw-color-code-chrome, #1f2937);
        border-bottom: 1px solid var(--shw-color-code-border, rgb(255 255 255 / 12%));
        color: var(--shw-color-code-muted, #9ca3af);
        display: flex;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.75rem;
        justify-content: space-between;
        line-height: 1.4;
        padding: 0.65rem 1rem;
      }

      .language {
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      pre {
        margin: 0;
        overflow-x: auto;
        padding: 1rem 1.15rem;
      }

      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.84rem;
        line-height: 1.7;
        tab-size: 2;
      }

      .token.comment,
      .token.prolog,
      .token.doctype,
      .token.cdata {
        color: var(--shw-code-comment, #94a3b8);
      }

      .token.punctuation {
        color: var(--shw-code-punctuation, #cbd5e1);
      }

      .token.property,
      .token.tag,
      .token.boolean,
      .token.number,
      .token.constant,
      .token.symbol,
      .token.deleted {
        color: var(--shw-code-value, #fda4af);
      }

      .token.selector,
      .token.attr-name,
      .token.string,
      .token.char,
      .token.builtin,
      .token.inserted {
        color: var(--shw-code-string, #86efac);
      }

      .token.operator,
      .token.entity,
      .token.url,
      .token.variable {
        color: var(--shw-code-operator, #67e8f9);
      }

      .token.atrule,
      .token.attr-value,
      .token.function,
      .token.class-name {
        color: var(--shw-code-function, #fde68a);
      }

      .token.keyword {
        color: var(--shw-code-keyword, #c4b5fd);
      }

      .token.regex,
      .token.important {
        color: var(--shw-code-important, #fdba74);
      }

      .token.important,
      .token.bold {
        font-weight: 700;
      }

      .token.italic {
        font-style: italic;
      }
    `,
  ];

  /** Optional filename shown above the code. */
  public filename = "";

  /** Syntax language. Supported values are html, js, ts, and json. */
  public language = "text";

  readonly #content = new LightDomTextController(this);

  protected override render() {
    const showCaption = this.filename !== "" || this.language !== "text";

    return html`
      <figure>
        ${
          showCaption
            ? html`<figcaption>
                <span>${this.filename}</span>
                <span class="language">${this.language}</span>
              </figcaption>`
            : nothing
        }
        <pre><code>${unsafeHTML(highlightCode(this.#content.source, this.language))}</code></pre>
      </figure>
    `;
  }
}

defineElement("shw-code", ShwCode);

declare global {
  interface HTMLElementTagNameMap {
    "shw-code": ShwCode;
  }
}
