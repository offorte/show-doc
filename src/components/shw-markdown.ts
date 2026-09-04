import { css, html, LitElement, nothing, unsafeCSS } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { defineElement } from "../internal/define-element";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import { renderMarkdown } from "../internal/render-markdown";
import { hostStyles } from "../styles/component-styles";
import proseStyles from "../styles/prose.css?inline";

/**
 * Renders safe CommonMark from its light DOM text.
 *
 * @element shw-markdown
 */
export class ShwMarkdown extends LitElement {
  public static override styles = [
    unsafeCSS(proseStyles),
    hostStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }

      .prose {
        --tw-prose-body: var(--shw-color-text, #293244);
        --tw-prose-headings: var(--shw-color-heading, #101827);
        --tw-prose-lead: var(--shw-color-muted, #667085);
        --tw-prose-links: var(--shw-color-accent, #4f46e5);
        --tw-prose-bold: var(--shw-color-heading, #101827);
        --tw-prose-counters: var(--shw-color-muted, #667085);
        --tw-prose-bullets: var(--shw-color-accent, #4f46e5);
        --tw-prose-hr: var(--shw-color-border, #dde2ea);
        --tw-prose-quotes: var(--shw-color-heading, #101827);
        --tw-prose-quote-borders: var(--shw-color-accent, #4f46e5);
        --tw-prose-captions: var(--shw-color-muted, #667085);
        --tw-prose-code: var(--shw-color-heading, #101827);
        --tw-prose-pre-code: var(--shw-color-code-text, #e6eaf2);
        --tw-prose-pre-bg: var(--shw-color-code-background, #111827);
        --tw-prose-th-borders: var(--shw-color-border, #dde2ea);
        --tw-prose-td-borders: var(--shw-color-border, #dde2ea);
        color: var(--shw-color-text, #293244);
        font-size: 1rem;
        line-height: 1.75;
        max-width: var(--shw-reading-width, 70ch);
      }

      .prose :where(h1, h2, h3, h4) {
        letter-spacing: -0.025em;
        text-wrap: balance;
      }

      .prose :where(p, li) {
        text-wrap: pretty;
      }

      .prose :where(a) {
        text-decoration-thickness: 0.08em;
        text-underline-offset: 0.18em;
      }

      .prose :where(a:focus-visible) {
        border-radius: 0.2rem;
        outline: 3px solid color-mix(in srgb, var(--shw-color-accent, #4f46e5) 28%, transparent);
        outline-offset: 3px;
      }

      .prose :where(pre) {
        border: 1px solid var(--shw-color-code-border, rgb(255 255 255 / 12%));
        border-radius: 0.75rem;
        box-shadow: 0 0.75rem 2rem var(--shw-color-shadow, rgb(15 23 42 / 10%));
      }

      .prose :where(input[type="checkbox"]) {
        accent-color: var(--shw-color-accent, #4f46e5);
      }

      .prose :where(:first-child) {
        margin-top: 0;
      }

      .prose :where(:last-child) {
        margin-bottom: 0;
      }
    `,
  ];

  readonly #content = new LightDomTextController(this);

  protected override render() {
    const source = this.#content.source;

    if (source === "") {
      return nothing;
    }

    return html`<div class="prose prose-slate max-w-none">
      ${unsafeHTML(renderMarkdown(source))}
    </div>`;
  }
}

defineElement("shw-markdown", ShwMarkdown);

declare global {
  interface HTMLElementTagNameMap {
    "shw-markdown": ShwMarkdown;
  }
}
