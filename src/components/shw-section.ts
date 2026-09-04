import { css, html, LitElement, nothing } from "lit";

import { defineElement } from "../internal/define-element";
import { headingStyles, hostStyles } from "../styles/component-styles";

/**
 * Groups related document blocks under a heading divider and optional short introduction.
 *
 * @element shw-section
 * @slot - The document blocks in the section.
 */
export class ShwSection extends LitElement {
  public static override properties = {
    heading: { type: String },
    intro: { type: String },
    level: { type: Number },
  };

  public static override styles = [
    hostStyles,
    headingStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }

      section,
      .section-header {
        display: grid;
        gap: 1.25rem;
      }

      .section-header {
        border-bottom: 1px solid var(--shw-color-border, #dde2ea);
        gap: 0.6rem;
        padding-bottom: 0.75rem;
      }

      .heading {
        font-size: clamp(1.5rem, 4vw, 2.15rem);
      }

      .intro {
        color: var(--shw-color-muted, #667085);
        line-height: 1.55;
        margin: 0;
        max-width: 54ch;
        text-wrap: pretty;
      }

      slot {
        display: grid;
        gap: 1.25rem;
        min-width: 0;
      }

      @media (min-width: 52rem) {
        .section-header[data-with-intro] {
          align-items: end;
          gap: clamp(2rem, 5vw, 4rem);
          grid-template-columns: minmax(12rem, 0.75fr) minmax(18rem, 1.25fr);
        }
      }
    `,
  ];

  /** Optional section heading. */
  public heading = "";

  /** Optional short context beside the section heading. */
  public intro = "";

  /** Heading level. Supported values are 2 and 3. */
  public level: 2 | 3 = 2;

  protected override render() {
    return html`<section>${this.#renderHeader()}<slot></slot></section>`;
  }

  #renderHeader() {
    if (this.heading === "") {
      return nothing;
    }

    return html`
      <header class="section-header" ?data-with-intro=${this.intro !== ""}>
        ${this.#renderHeading()} ${this.#renderIntro()}
      </header>
    `;
  }

  #renderHeading() {
    return this.level === 3
      ? html`<h3 class="heading">${this.heading}</h3>`
      : html`<h2 class="heading">${this.heading}</h2>`;
  }

  #renderIntro() {
    return this.intro === "" ? nothing : html`<p class="intro">${this.intro}</p>`;
  }
}

defineElement("shw-section", ShwSection);

declare global {
  interface HTMLElementTagNameMap {
    "shw-section": ShwSection;
  }
}
