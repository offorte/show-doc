import flowStyles from "@xyflow/react/dist/base.css?inline";
import { css, html, LitElement, nothing, svg as svgTemplate, unsafeCSS } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import mermaid from "mermaid";

import { defineElement } from "../internal/define-element";
import { mountDiagram } from "../internal/diagram/diagram-view";
import diagramStyles from "../internal/diagram/diagram.css?inline";
import { EXPAND_ICON_PATH } from "../internal/diagram/icons";
import { layoutDiagram } from "../internal/diagram/layout-diagram";
import { readDiagram } from "../internal/diagram/read-diagram";
import type { DiagramLayout } from "../internal/diagram/types";
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
  return explicitTheme === "dark";
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

type DrawnDiagram = { layout: DiagramLayout } | { svg: string };

function configureMermaid(themeVariables: MermaidThemeVariables): void {
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
}

function drawDiagram(
  source: string,
  themeVariables: MermaidThemeVariables,
  host: Element,
): Promise<DrawnDiagram> {
  const draw = async (): Promise<DrawnDiagram> => {
    configureMermaid(themeVariables);
    const diagram = await mermaid.mermaidAPI.getDiagramFromText(source);
    try {
      const model = readDiagram(diagram.type, diagram.db, source);
      if (model !== null) {
        return { layout: await layoutDiagram(model, host) };
      }
    } catch (error) {
      console.warn("ShowDoc could not draw this diagram. Mermaid draws it instead.", error);
    }
    diagramNumber += 1;
    const { svg } = await mermaid.render(`shw-mermaid-${diagramNumber}`, source);
    return { svg };
  };

  const result = renderQueue.then(draw, draw);
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
    page: { type: Boolean, reflect: true },
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
        border-color: var(--shw-color-border, #dde2ea) var(--shw-color-border, #dde2ea)
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
    unsafeCSS(flowStyles),
    unsafeCSS(diagramStyles),
  ];

  /** Accessible name for the rendered diagram. */
  public label = "Diagram";

  /** Fills the browser window with this one diagram. Use it without `shw-doc`. */
  public page = false;

  readonly #content = new LightDomTextController(this);
  readonly #rootObserver = new MutationObserver(() => this.requestUpdate());
  #drawnSource = "";
  #error = false;
  #expanded = false;
  #layout: DiagramLayout | null = null;
  #mountedLayout: DiagramLayout | null = null;
  #mountKey = "";
  #pageScroll = { x: 0, y: 0 };
  #renderKey = "";
  #renderNumber = 0;
  #startedSource = "";
  #svg = "";
  #unmount: (() => void) | null = null;
  #unmountOverlay: (() => void) | null = null;

  public override connectedCallback(): void {
    super.connectedCallback();
    this.requestUpdate();
    this.#rootObserver.observe(document.documentElement, {
      attributeFilter: ["data-shw-theme", "data-theme"],
    });
  }

  public override disconnectedCallback(): void {
    this.#rootObserver.disconnect();
    this.#closeOverlay();
    this.#removeDiagram();
    // The next connection draws again, because the mounted view is gone.
    this.#renderKey = "";
    this.#layout = null;
    super.disconnectedCallback();
  }

  #removeDiagram(): void {
    this.#unmount?.();
    this.#unmount = null;
    this.#mountedLayout = null;
  }

  readonly #expand = (): void => {
    this.#expanded = true;
    this.requestUpdate();
  };

  #toggleTheme(): void {
    document.documentElement.dataset.shwTheme = usesDarkTheme() ? "light" : "dark";
  }

  #renderThemeToggle() {
    return html`<button
      class="theme-toggle"
      type="button"
      aria-label="Switch light and dark"
      @click=${this.#toggleTheme}
    >
      ◐
    </button>`;
  }

  #overlayDialog(): HTMLDialogElement | null {
    return this.renderRoot.querySelector<HTMLDialogElement>(".overlay");
  }

  #closeOverlay(): void {
    this.#overlayDialog()?.close();
    this.#releaseOverlay();
  }

  #releaseOverlay(): void {
    if (this.#expanded) {
      this.#expanded = false;
      this.#unmountOverlay?.();
      this.#unmountOverlay = null;
      // Keys and the wheel can still scroll the hidden page while the overlay is open.
      scrollTo({ left: this.#pageScroll.x, top: this.#pageScroll.y, behavior: "instant" });
      this.requestUpdate();
    }
  }

  #syncOverlay(): void {
    const dialog = this.#overlayDialog();
    if (this.#expanded && dialog !== null && !dialog.open) {
      this.#pageScroll = { x: scrollX, y: scrollY };
      dialog.showModal();
      this.#mountOverlayCanvas(dialog);
    }
  }

  #mountOverlayCanvas(dialog: HTMLDialogElement): void {
    const canvas = dialog.querySelector<HTMLElement>(".overlay-canvas");
    if (canvas !== null && this.#layout !== null) {
      this.#unmountOverlay = mountDiagram(canvas, {
        layout: this.#layout,
        label: this.label,
        page: true,
        onExpand: undefined,
      });
    }
  }

  #renderMermaidDrawing() {
    return html`<div class="diagram" role="img" aria-label=${this.label}>
      ${unsafeHTML(this.#svg)}
    </div>`;
  }

  #renderBody() {
    if (this.#error) {
      return html`
        <p class="message error" role="alert">
          Diagram could not be rendered. Check the Mermaid source.
        </p>
      `;
    }
    if (this.#layout !== null) {
      return html`<div class="canvas"></div>`;
    }
    return this.#svg === ""
      ? html`<p class="message" role="status">Rendering diagram...</p>`
      : this.#renderMermaidFrame();
  }

  #renderMermaidFrame() {
    if (this.page) {
      return this.#renderMermaidDrawing();
    }
    return html`<div class="diagram-frame">
      ${this.#renderMermaidDrawing()}
      <div class="tools">
        <button type="button" aria-label="Expand diagram" @click=${this.#expand}>
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
            ${svgTemplate`<path d=${EXPAND_ICON_PATH} />`}
          </svg>
        </button>
      </div>
    </div>`;
  }

  #renderOverlayContent() {
    if (!this.#expanded) {
      return nothing;
    }
    return this.#layout === null
      ? this.#renderMermaidDrawing()
      : html`<div class="canvas overlay-canvas"></div>`;
  }

  #renderOverlay() {
    if (this.page) {
      return this.#renderThemeToggle();
    }
    return html`<dialog class="overlay" aria-label=${this.label} @close=${this.#releaseOverlay}>
      ${this.#renderThemeToggle()}
      <button
        class="overlay-close"
        type="button"
        aria-label="Close diagram"
        @click=${this.#closeOverlay}
      >
        ×
      </button>
      ${this.#renderOverlayContent()}
    </dialog>`;
  }

  protected override render() {
    return html`<span class="theme-probe" aria-hidden="true"></span
      >${this.#renderBody()}${this.#renderOverlay()}`;
  }

  protected override updated(): void {
    const probe = this.renderRoot.querySelector<HTMLElement>(".theme-probe");
    if (probe === null) {
      return;
    }
    this.#syncDiagram();
    this.#syncOverlay();

    const source = this.#content.source;
    const themeVariables = activeTheme(probe);
    const renderKey = `${JSON.stringify(themeVariables)}\n${source}`;
    if (renderKey !== this.#renderKey && !this.#followsThemeByItself(source)) {
      this.#renderKey = renderKey;
      this.#startDraw(source, themeVariables);
    }
  }

  /** ShowDoc's own drawing follows the theme through CSS, so only its source matters. */
  #followsThemeByItself(source: string): boolean {
    return this.#layout !== null && this.#drawnSource === source;
  }

  #startDraw(source: string, themeVariables: MermaidThemeVariables): void {
    this.#renderNumber += 1;
    const currentRender = this.#renderNumber;
    // A theme change also draws Mermaid's diagram again, and that must keep the overlay open.
    if (source !== this.#startedSource) {
      this.#closeOverlay();
    }
    this.#startedSource = source;
    this.#error = source === "";
    this.#svg = "";
    this.#layout = null;
    this.#drawnSource = "";

    if (this.#error) {
      this.requestUpdate();
      return;
    }

    const finish = (apply: () => void): void => {
      if (currentRender === this.#renderNumber) {
        apply();
        this.requestUpdate();
      }
    };
    void drawDiagram(source, themeVariables, this).then(
      (drawn) => finish(() => this.#showDrawing(drawn, source)),
      () =>
        finish(() => {
          this.#error = true;
        }),
    );
  }

  #showDrawing(drawn: DrawnDiagram, source: string): void {
    if ("layout" in drawn) {
      this.#layout = drawn.layout;
      this.#drawnSource = source;
    } else {
      this.#svg = drawn.svg;
    }
  }

  #syncDiagram(): void {
    const mountKey = `${this.label}\n${this.page}`;
    if (this.#layout === this.#mountedLayout && mountKey === this.#mountKey) {
      return;
    }
    this.#removeDiagram();
    this.#mountKey = mountKey;
    const canvas = this.renderRoot.querySelector<HTMLElement>(".canvas:not(.overlay-canvas)");
    if (canvas !== null) {
      this.#mountCanvas(canvas);
    }
  }

  #mountCanvas(canvas: HTMLElement): void {
    if (this.#layout !== null) {
      this.#unmount = mountDiagram(canvas, {
        layout: this.#layout,
        label: this.label,
        page: this.page,
        onExpand: this.page ? undefined : this.#expand,
      });
      this.#mountedLayout = this.#layout;
    }
  }
}

defineElement("shw-mermaid", ShwMermaid);

declare global {
  interface HTMLElementTagNameMap {
    "shw-mermaid": ShwMermaid;
  }
}
