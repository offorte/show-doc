import { css, html, LitElement } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import mermaid from "mermaid";

import { defineElement } from "../internal/define-element";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import { hostStyles } from "../styles/component-styles";

type MermaidTheme = "dark" | "default";

const themeNames: Record<string, MermaidTheme> = {
  dark: "dark",
  light: "default",
};
let diagramNumber = 0;
let renderQueue = Promise.resolve();

function activeTheme(): MermaidTheme {
  const root = document.documentElement;
  const explicitTheme = [root.dataset.shwTheme, root.dataset.theme].find(Boolean);
  const systemTheme = ["default", "dark"][
    Number(window.matchMedia("(prefers-color-scheme: dark)").matches)
  ] as MermaidTheme;
  return themeNames[String(explicitTheme)] ?? systemTheme;
}

function renderDiagram(source: string, theme: MermaidTheme): Promise<string> {
  const render = async (): Promise<string> => {
    diagramNumber += 1;
    mermaid.initialize({
      htmlLabels: false,
      securityLevel: "strict",
      secure: [
        "secure",
        "securityLevel",
        "startOnLoad",
        "maxTextSize",
        "suppressErrorRendering",
        "maxEdges",
        "htmlLabels",
      ],
      startOnLoad: false,
      suppressErrorRendering: true,
      theme,
    });

    const { svg } = await mermaid.render(`shw-mermaid-${diagramNumber}`, source);
    return svg;
  };

  const result = renderQueue.then(render, render);
  renderQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/**
 * Renders Mermaid source as a responsive diagram.
 *
 * @element shw-mermaid
 */
export class ShwMermaid extends LitElement {
  public static override properties = {
    label: { type: String },
  };

  public static override styles = [
    hostStyles,
    css`
      :host {
        display: block;
        min-width: 0;
      }

      .diagram {
        align-items: center;
        display: flex;
        justify-content: center;
        min-height: 4rem;
        overflow-x: auto;
        width: 100%;
      }

      .diagram svg {
        display: block;
        height: auto;
        margin-inline: auto;
        max-width: none !important;
        width: 100%;
      }

      .message {
        color: var(--shw-color-muted, #667085);
        font-size: 0.84rem;
        margin: 0;
        padding: 1rem;
        text-align: center;
      }

      .error {
        color: var(--shw-tone-danger, #b42318);
      }
    `,
  ];

  /** Accessible name for the rendered diagram. */
  public label = "Diagram";

  readonly #content = new LightDomTextController(this);
  readonly #media = window.matchMedia("(prefers-color-scheme: dark)");
  readonly #rootObserver = new MutationObserver(() => this.requestUpdate());
  #error = false;
  #renderKey = "";
  #renderNumber = 0;
  #svg = "";

  public override connectedCallback(): void {
    super.connectedCallback();
    this.#media.addEventListener("change", this.#handleThemeChange);
    this.#rootObserver.observe(document.documentElement, {
      attributeFilter: ["data-shw-theme", "data-theme"],
    });
  }

  public override disconnectedCallback(): void {
    this.#media.removeEventListener("change", this.#handleThemeChange);
    this.#rootObserver.disconnect();
    super.disconnectedCallback();
  }

  protected override render() {
    if (this.#error) {
      return html`<p class="message error" role="alert">
        Diagram could not be rendered. Check the Mermaid source.
      </p>`;
    }

    if (this.#svg === "") {
      return html`<p class="message" role="status">Rendering diagram...</p>`;
    }

    return html`<div class="diagram" role="img" aria-label=${this.label}>
      ${unsafeHTML(this.#svg)}
    </div>`;
  }

  protected override updated(): void {
    const source = this.#content.source;
    const theme = activeTheme();
    const renderKey = `${theme}\n${source}`;

    if (renderKey === this.#renderKey) {
      return;
    }

    this.#renderKey = renderKey;
    this.#renderNumber += 1;
    const currentRender = this.#renderNumber;
    this.#error = false;
    this.#svg = "";

    if (source === "") {
      this.#error = true;
      this.requestUpdate();
      return;
    }

    void renderDiagram(source, theme).then(
      (svg) => {
        if (currentRender !== this.#renderNumber) {
          return;
        }

        this.#svg = svg;
        this.requestUpdate();
      },
      () => {
        if (currentRender !== this.#renderNumber) {
          return;
        }

        this.#error = true;
        this.requestUpdate();
      },
    );
  }

  readonly #handleThemeChange = (): void => {
    this.requestUpdate();
  };
}

defineElement("shw-mermaid", ShwMermaid);

declare global {
  interface HTMLElementTagNameMap {
    "shw-mermaid": ShwMermaid;
  }
}
