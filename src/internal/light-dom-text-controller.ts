import type { ReactiveController, ReactiveControllerHost } from "lit";

import { normalizeMarkdownSource } from "./normalize-markdown-source";

type TextHost = ReactiveControllerHost & HTMLElement;

export class LightDomTextController implements ReactiveController {
  public source = "";

  readonly #host: TextHost;
  readonly #observer: MutationObserver;

  public constructor(host: TextHost) {
    this.#host = host;
    this.#host.addController(this);
    this.#observer = new MutationObserver(() => this.#synchronize());
  }

  public hostConnected(): void {
    this.#synchronize();
    this.#observer.observe(this.#host, {
      characterData: true,
      childList: true,
      subtree: true,
    });
  }

  public hostDisconnected(): void {
    this.#observer.disconnect();
  }

  #synchronize(): void {
    const source = normalizeMarkdownSource(this.#host.textContent ?? "");

    if (source !== this.source) {
      this.source = source;
      this.#host.requestUpdate();
    }
  }
}
