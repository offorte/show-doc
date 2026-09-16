import { html, LitElement, nothing, unsafeCSS } from "lit";

import { defineElement } from "../internal/define-element";
import { headingStyles, hostStyles } from "../styles/component-styles";
import sectionStyles from "../styles/section.css?inline";

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

  public static override styles = [hostStyles, headingStyles, unsafeCSS(sectionStyles)];

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
