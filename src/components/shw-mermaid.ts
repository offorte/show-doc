import { css, html, LitElement } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import mermaid from "mermaid";

import { defineElement } from "../internal/define-element";
import { LightDomTextController } from "../internal/light-dom-text-controller";
import { hostStyles } from "../styles/component-styles";

type MermaidThemeVariables = {
  background: string;
  darkMode: boolean;
  fontFamily: string;
  fontSize: string;
  lineColor: string;
  primaryBorderColor: string;
  primaryColor: string;
  primaryTextColor: string;
  secondaryBorderColor: string;
  secondaryColor: string;
  secondaryTextColor: string;
  tertiaryBorderColor: string;
  tertiaryColor: string;
  tertiaryTextColor: string;
  textColor: string;
};

let diagramNumber = 0;
let renderQueue = Promise.resolve();

function usesDarkTheme(): boolean {
  const root = document.documentElement;
  const explicitTheme = [root.dataset.shwTheme, root.dataset.theme].find(Boolean);
  return (
    explicitTheme === "dark" ||
    (explicitTheme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

function activeTheme(probe: HTMLElement): MermaidThemeVariables {
  const styles = getComputedStyle(probe);

  return {
    background: styles.backgroundColor,
    darkMode: usesDarkTheme(),
    fontFamily: styles.fontFamily,
    fontSize: styles.fontSize,
    lineColor: styles.textDecorationColor,
    primaryBorderColor: styles.borderRightColor,
    primaryColor: styles.borderBottomColor,
    primaryTextColor: styles.outlineColor,
    secondaryBorderColor: styles.borderTopColor,
    secondaryColor: styles.borderLeftColor,
    secondaryTextColor: styles.color,
    tertiaryBorderColor: styles.borderTopColor,
    tertiaryColor: styles.backgroundColor,
    tertiaryTextColor: styles.color,
    textColor: styles.color,
  };
}

function renderDiagram(source: string, themeVariables: MermaidThemeVariables): Promise<string> {
  const render = async (): Promise<string> => {
    diagramNumber += 1;
    mermaid.initialize({
      flowchart: {
        curve: "basis",
        nodeSpacing: 40,
        rankSpacing: 50,
        useMaxWidth: true,
      },
      htmlLabels: false,
      look: "classic",
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
      theme: "base",
      themeVariables: {
        ...themeVariables,
        clusterBkg: themeVariables.secondaryColor,
        clusterBorder: themeVariables.secondaryBorderColor,
        defaultLinkColor: themeVariables.lineColor,
        edgeLabelBackground: themeVariables.background,
        mainBkg: themeVariables.primaryColor,
        nodeBorder: themeVariables.primaryBorderColor,
        nodeTextColor: themeVariables.primaryTextColor,
        noteBkgColor: themeVariables.secondaryColor,
        noteBorderColor: themeVariables.secondaryBorderColor,
        noteTextColor: themeVariables.secondaryTextColor,
        radius: 8,
        strokeWidth: 1.25,
        titleColor: themeVariables.primaryTextColor,
        useGradient: false,
      },
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
        width: 100%;
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
        width: 100%;
      }

      .theme-probe {
        background-color: var(--shw-color-surface, #ffffff);
        border-color: var(--shw-color-border, #dde2ea) var(--shw-color-accent, #4f46e5)
          var(--shw-color-accent-soft, #eef2ff) var(--shw-color-surface-muted, #f8fafc);
        border-style: solid;
        color: var(--shw-color-text, #293244);
        font-family:
          var(--shw-font-sans, Inter),
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        font-size: 1rem;
        outline-color: var(--shw-color-heading, #101827);
        position: absolute;
        text-decoration-color: var(--shw-color-muted, #667085);
        visibility: hidden;
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
      return html`
        <span class="theme-probe" aria-hidden="true"></span>
        <p class="message error" role="alert">
          Diagram could not be rendered. Check the Mermaid source.
        </p>
      `;
    }

    if (this.#svg === "") {
      return html`
        <span class="theme-probe" aria-hidden="true"></span>
        <p class="message" role="status">Rendering diagram...</p>
      `;
    }

    return html`
      <span class="theme-probe" aria-hidden="true"></span>
      <div class="diagram" role="img" aria-label=${this.label}>${unsafeHTML(this.#svg)}</div>
    `;
  }

  protected override updated(): void {
    const source = this.#content.source;
    const probe = this.renderRoot.querySelector<HTMLElement>(".theme-probe");

    if (probe === null) {
      return;
    }

    const themeVariables = activeTheme(probe);
    const renderKey = `${JSON.stringify(themeVariables)}\n${source}`;

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

    void renderDiagram(source, themeVariables).then(
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
