import { html, nothing, type ReactiveController, type ReactiveControllerHost, svg } from "lit";

import { toggleTheme } from "./theme";

type MenuHost = ReactiveControllerHost & HTMLElement & { nav: string };
type SectionLink = { element: Element; heading: string; id: string };

const minimumSections = 4;
const activeLine = 0.25;
const scrollSettleMs = 150;

const menuIcon = svg`<path d="M4 7h16M4 12h16M4 17h10" />`;
const topIcon = svg`<path d="M12 19V5M6 11l6-6 6 6" />`;
const themeIcon = svg`
  <path class="moon" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  <g class="sun">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </g>
`;

function icon(paths: unknown) {
  return html`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}

function uniqueId(heading: string): string {
  const base =
    heading
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") || "section";
  let id = base;
  // A section with id top would take over the Back to top link.
  for (let number = 2; id === "top" || document.getElementById(id) !== null; number += 1) {
    id = `${base}-${number}`;
  }
  return id;
}

function isAtPageEnd(): boolean {
  return scrollY > 0 && scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
}

export class SectionMenuController implements ReactiveController {
  #active = "";
  #frame = 0;
  #links: SectionLink[] = [];
  #listening = false;
  #open = false;
  #settleTimer = 0;

  readonly #host: MenuHost;
  readonly #observer = new MutationObserver(() => this.refresh());

  public constructor(host: MenuHost) {
    this.#host = host;
    host.addController(this);
  }

  public hostConnected(): void {
    this.#observer.observe(this.#host, {
      attributeFilter: ["heading", "level"],
      childList: true,
      subtree: true,
    });
    this.refresh();
  }

  public hostDisconnected(): void {
    this.#observer.disconnect();
    this.#setListening(false);
  }

  public refresh(): void {
    const sections =
      this.#host.nav === "off"
        ? []
        : [...this.#host.querySelectorAll(":scope > shw-section[heading]")].filter(
            (section) =>
              section.getAttribute("level") !== "3" &&
              section.getAttribute("heading")?.trim() !== "",
          );

    this.#links =
      sections.length < minimumSections
        ? []
        : sections.map((element) => {
            const heading = element.getAttribute("heading")?.trim() ?? "";
            element.id ||= uniqueId(heading);
            return { element, heading, id: element.id };
          });

    this.#setListening(this.#links.length > 0);
    this.#scheduleMeasure();
    this.#host.requestUpdate();
  }

  public render() {
    if (this.#links.length === 0) {
      return nothing;
    }

    return html`<nav class="menu" aria-label="Sections" ?data-open=${this.#open}>
      <button
        class="toggle"
        type="button"
        aria-label="Section menu"
        aria-expanded=${this.#open ? "true" : "false"}
        @click=${this.#toggleOpen}
      >
        ${icon(menuIcon)}
      </button>
      <div class="panel">
        <ol class="links">
          ${this.#links.map(
            ({ heading, id }, index) => html`<li>
              <a
                class="item"
                href="#${encodeURIComponent(id)}"
                title=${heading}
                aria-current=${this.#active === id ? "location" : nothing}
                @click=${() => this.#select(id)}
              >
                <span class="mark"
                  ><span class="number" aria-hidden="true">${index + 1}</span></span
                >
                <span class="label">${heading}</span>
              </a>
            </li>`,
          )}
        </ol>
        <div class="actions">
          <a class="item" href="#top" @click=${() => this.#select("")}>
            <span class="mark">${icon(topIcon)}</span>
            <span class="label">Back to top</span>
          </a>
          <button
            class="item theme"
            type="button"
            aria-label="Switch light and dark"
            title="Switch light and dark"
            @click=${toggleTheme}
          >
            <span class="mark">${icon(themeIcon)}</span>
          </button>
        </div>
      </div>
    </nav>`;
  }

  #setListening(listening: boolean): void {
    if (listening === this.#listening) {
      return;
    }
    this.#listening = listening;

    if (listening) {
      window.addEventListener("scroll", this.#onScroll, { passive: true });
      window.addEventListener("resize", this.#onScroll, { passive: true });
      document.addEventListener("pointerdown", this.#onPointerDown);
      document.addEventListener("keydown", this.#onKeyDown);
    } else {
      window.removeEventListener("scroll", this.#onScroll);
      window.removeEventListener("resize", this.#onScroll);
      document.removeEventListener("pointerdown", this.#onPointerDown);
      document.removeEventListener("keydown", this.#onKeyDown);
      cancelAnimationFrame(this.#frame);
      clearTimeout(this.#settleTimer);
      this.#frame = 0;
      this.#settleTimer = 0;
    }
  }

  readonly #onScroll = (): void => {
    if (this.#settleTimer !== 0) {
      this.#holdSelection();
    } else {
      this.#scheduleMeasure();
    }
  };

  // Sections have no layout before the first render, so a measure always waits for a frame.
  #scheduleMeasure(): void {
    if (this.#links.length > 0 && this.#frame === 0) {
      this.#frame = requestAnimationFrame(() => {
        this.#frame = 0;
        this.#measure();
      });
    }
  }

  #measure(): void {
    if (this.#settleTimer === 0) {
      this.#setActive(this.#currentId());
    }
  }

  #currentId(): string {
    // A short last section can never reach the active line, so the page end selects it.
    const line = isAtPageEnd() ? Number.POSITIVE_INFINITY : innerHeight * activeLine;
    const current = this.#links.findLast(
      ({ element }) => element.getBoundingClientRect().top <= line,
    );
    return current?.id ?? "";
  }

  #setActive(active: string): void {
    if (active !== this.#active) {
      this.#active = active;
      this.#host.requestUpdate();
    }
  }

  // A clicked section may not reach the active line near the page end. Keep the
  // reader's choice until this smooth scroll stops.
  #select(id: string): void {
    this.#setActive(id);
    this.#setOpen(false);
    this.#holdSelection();
  }

  #holdSelection(): void {
    clearTimeout(this.#settleTimer);
    this.#settleTimer = window.setTimeout(() => {
      this.#settleTimer = 0;
    }, scrollSettleMs);
  }

  readonly #toggleOpen = (): void => {
    this.#setOpen(!this.#open);
  };

  #setOpen(open: boolean): void {
    if (open !== this.#open) {
      this.#open = open;
      this.#host.requestUpdate();
    }
  }

  readonly #onPointerDown = (event: Event): void => {
    const menu = this.#host.shadowRoot?.querySelector(".menu");
    if (this.#open && menu && !event.composedPath().includes(menu)) {
      this.#setOpen(false);
    }
  };

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (this.#open && event.key === "Escape") {
      this.#setOpen(false);
      this.#host.shadowRoot?.querySelector<HTMLElement>(".toggle")?.focus();
    }
  };
}
