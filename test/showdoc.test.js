import { aTimeout, expect, fixture, html, waitUntil } from "@open-wc/testing";

import "../dist/showdoc.js";

const tagNames = [
  "shw-badge",
  "shw-callout",
  "shw-card",
  "shw-collapsible",
  "shw-code",
  "shw-doc",
  "shw-figure",
  "shw-grid",
  "shw-header",
  "shw-markdown",
  "shw-section",
  "shw-stat",
  "shw-steps",
  "shw-summary",
  "shw-table",
];

async function waitForMermaidSvg(element) {
  await waitUntil(
    () => element.shadowRoot.querySelector("svg"),
    "Mermaid did not render within 2.5 seconds.",
    { timeout: 2_500 },
  );
  return element.shadowRoot.querySelector("svg");
}

describe("Offorte ShowDoc", () => {
  it("installs the global stylesheet from the JavaScript bundle", () => {
    const stylesheet = document.head.querySelector("style[data-shw-styles]");

    expect(stylesheet).not.to.equal(null);
    expect(stylesheet.textContent).to.include("--shw-color-page");
    expect(stylesheet.textContent).to.include("data-shw-theme=dark");
  });

  it("registers every public component with Shadow DOM", async () => {
    const elements = tagNames.map((tagName) => {
      const element = document.createElement(tagName);
      document.body.append(element);
      return element;
    });

    await Promise.all(elements.map((element) => element.updateComplete));

    for (const [index, tagName] of tagNames.entries()) {
      const element = elements[index];
      expect(customElements.get(tagName)).to.be.a("function");
      expect(element.shadowRoot).not.to.equal(null);
      element.remove();
    }
  });

  it("turns Markdown headings, paragraphs, emphasis, and lists into HTML", async () => {
    const element = await fixture(html`<shw-markdown></shw-markdown>`);
    element.textContent =
      "## A clear heading\n\nFirst paragraph with **strong text**.\n\n* One\n* Two";
    await aTimeout(0);
    await element.updateComplete;

    expect(element.shadowRoot.querySelector("h2").textContent).to.equal("A clear heading");
    expect(element.shadowRoot.querySelectorAll("p")).to.have.length(1);
    expect(element.shadowRoot.querySelector("strong").textContent).to.equal("strong text");
    expect(element.shadowRoot.querySelectorAll("li")).to.have.length(2);
  });

  it("renders GFM task lists and strikethrough", async () => {
    const element = await fixture(html`<shw-markdown></shw-markdown>`);
    element.textContent = "- [x] Complete\n- [ ] Open\n\n~~Removed~~";
    await aTimeout(0);
    await element.updateComplete;

    expect(element.shadowRoot.querySelectorAll('input[type="checkbox"]')).to.have.length(2);
    expect(element.shadowRoot.querySelector('input[type="checkbox"]').checked).to.equal(true);
    expect(element.shadowRoot.querySelector("del").textContent).to.equal("Removed");
  });

  it("does not enable raw HTML or unsafe protocols", async () => {
    const element = await fixture(html`<shw-markdown></shw-markdown>`);
    element.textContent =
      '<script>window.showDocUnsafeTest = true</script>\n\n[Bad](javascript:alert("x"))';
    await aTimeout(0);
    await element.updateComplete;

    expect(element.shadowRoot.querySelector("script")).to.equal(null);
    expect(window.showDocUnsafeTest).not.to.equal(true);
    expect(element.shadowRoot.querySelector("a")?.getAttribute("href") ?? "").not.to.match(
      /^javascript:/iu,
    );
  });

  it("updates when its light DOM Markdown changes", async () => {
    const element = await fixture(html`<shw-markdown>First</shw-markdown>`);
    element.textContent = "# Updated";
    await aTimeout(0);
    await element.updateComplete;

    expect(element.shadowRoot.querySelector("h1").textContent).to.equal("Updated");
  });

  it("auto-formats header and callout body text as Markdown", async () => {
    const header = await fixture(html`
      <shw-header heading="A title">A **short** introduction.</shw-header>
    `);
    const callout = await fixture(html`
      <shw-callout heading="Note">Keep this *small*.</shw-callout>
    `);

    const headerMarkdown = header.shadowRoot.querySelector("shw-markdown");
    const calloutMarkdown = callout.shadowRoot.querySelector("shw-markdown");
    await Promise.all([headerMarkdown.updateComplete, calloutMarkdown.updateComplete]);

    expect(headerMarkdown.shadowRoot.querySelector("strong").textContent).to.equal("short");
    expect(calloutMarkdown.shadowRoot.querySelector("em").textContent).to.equal("small");
  });

  it("renders badges, Markdown cards, and a document summary", async () => {
    const badge = await fixture(html`<shw-badge tone="success">Confirmed</shw-badge>`);
    const card = await fixture(html`
      <shw-card heading="Delivery" label="Ready" tone="success">
        The release is **approved**.
      </shw-card>
    `);
    const summary = await fixture(html`
      <shw-summary heading="In short">The main decision is **clear**.</shw-summary>
    `);

    const cardBadge = card.shadowRoot.querySelector("shw-badge");
    const cardMarkdown = card.shadowRoot.querySelector("shw-markdown");
    const summaryMarkdown = summary.shadowRoot.querySelector("shw-markdown");
    await Promise.all([
      cardBadge.updateComplete,
      cardMarkdown.updateComplete,
      summaryMarkdown.updateComplete,
    ]);

    expect(badge.tone).to.equal("success");
    expect(badge.textContent).to.equal("Confirmed");
    expect(cardBadge.textContent).to.equal("Ready");
    expect(cardMarkdown.shadowRoot.querySelector("strong").textContent).to.equal("approved");
    expect(summary.shadowRoot.querySelector("h2").textContent).to.equal("In short");
    expect(summaryMarkdown.shadowRoot.querySelector("strong").textContent).to.equal("clear");
  });

  it("uses native details and keeps the open attribute in sync", async () => {
    const element = await fixture(html`
      <shw-collapsible summary="More context">Hidden **details**.</shw-collapsible>
    `);
    const details = element.shadowRoot.querySelector("details");

    details.querySelector("summary").click();
    await aTimeout(0);
    await element.updateComplete;

    expect(element.open).to.equal(true);
    expect(element.hasAttribute("open")).to.equal(true);
    expect(details.querySelector("summary").textContent).to.equal("More context");
  });

  it("renders compact pipe text as an accessible table", async () => {
    const element = await fixture(html`<shw-table caption="Options"></shw-table>`);
    element.textContent =
      "Option | Benefit | Note\n--- | --- | ---\nA | Small | Escaped \\| pipe\nB | Large";
    await aTimeout(0);
    await element.updateComplete;

    expect(element.shadowRoot.querySelector("caption").textContent.trim()).to.equal("Options");
    expect(element.shadowRoot.querySelectorAll('th[scope="col"]')).to.have.length(3);
    expect(element.shadowRoot.querySelectorAll("tbody tr")).to.have.length(2);
    expect(element.shadowRoot.querySelector("tbody td").dataset.label).to.equal("Option");
    expect(element.shadowRoot.querySelector("tbody tr td:last-child").textContent).to.equal(
      "Escaped | pipe",
    );
  });

  it("renders safe Markdown inside table cells", async () => {
    const element = await fixture(html`<shw-table></shw-table>`);
    element.textContent = "Item | Status\nAPI | **Ready**\nOld | ~~Removed~~";
    await aTimeout(0);
    await element.updateComplete;

    expect(element.shadowRoot.querySelector("tbody strong").textContent).to.equal("Ready");
    expect(element.shadowRoot.querySelector("tbody del").textContent).to.equal("Removed");
  });

  it("renders code, stats, steps, and figures", async () => {
    const code = await fixture(html`
      <shw-code filename="answer.ts" language="ts">const answer: number = 42;</shw-code>
    `);
    const stat = await fixture(html`
      <shw-stat label="Source lines" value="48" change="About 90% less" tone="success"></shw-stat>
    `);
    const steps = await fixture(html`
      <shw-steps>
        1. Write **compact source**. 2. Load the bundle. 3. Read the document.
      </shw-steps>
    `);
    const figure = await fixture(html`
      <shw-figure caption="A simple flow"><svg aria-label="Flow"></svg></shw-figure>
    `);
    await aTimeout(0);
    await Promise.all([
      code.updateComplete,
      stat.updateComplete,
      steps.updateComplete,
      figure.updateComplete,
    ]);
    await Promise.all(
      [...steps.shadowRoot.querySelectorAll("shw-markdown")].map(
        (markdown) => markdown.updateComplete,
      ),
    );

    expect(code.shadowRoot.querySelector("figcaption").textContent).to.include("answer.ts");
    expect(code.shadowRoot.querySelector(".token.keyword").textContent).to.equal("const");
    expect(stat.shadowRoot.querySelector(".value").textContent).to.equal("48");
    expect(stat.shadowRoot.querySelector(".change").textContent).to.equal("About 90% less");
    expect(steps.shadowRoot.querySelectorAll("li")).to.have.length(3);
    expect(steps.shadowRoot.querySelector(".marker").getAttribute("aria-hidden")).to.equal("true");
    expect(
      steps.shadowRoot.querySelector("shw-markdown").shadowRoot.querySelector("strong").textContent,
    ).to.equal("compact source");
    expect(figure.shadowRoot.querySelector("figcaption").textContent).to.equal("A simple flow");
  });

  it("renders Mermaid from the larger bundle", async () => {
    await import("../dist/showdoc-mermaid.js");
    const element = await fixture(html`<shw-mermaid label="Release flow"></shw-mermaid>`);
    element.textContent = "flowchart LR\nA[Write] --> B[Render] --> C[Read]";
    await aTimeout(0);
    const svg = await waitForMermaidSvg(element);

    expect(svg).not.to.equal(null);
    expect(element.shadowRoot.querySelector('[role="img"]').getAttribute("aria-label")).to.equal(
      "Release flow",
    );
    expect(svg.textContent).to.include("Write");
  });

  it("removes executable content from Mermaid output", async () => {
    await import("../dist/showdoc-mermaid.js");
    const element = await fixture(html`<shw-mermaid label="Unsafe input test"></shw-mermaid>`);
    element.textContent = [
      "flowchart LR",
      'A["<img src=x onerror=alert(1)>"] --> B[Safe]',
      'click A "javascript:alert(1)" "Unsafe"',
    ].join("\n");
    await aTimeout(0);
    await waitForMermaidSvg(element);

    const renderedElements = [...element.shadowRoot.querySelectorAll("*")];
    const urls = renderedElements.flatMap((renderedElement) =>
      ["href", "xlink:href", "src"]
        .map((attribute) => renderedElement.getAttribute(attribute))
        .filter((value) => value !== null),
    );

    expect(element.shadowRoot.querySelector("script, iframe, object, embed, img")).to.equal(null);
    expect(element.shadowRoot.querySelector("[onerror], [onload], [onclick]")).to.equal(null);
    expect(urls.every((url) => !/^\s*(?:javascript|data):/iu.test(url))).to.equal(true);
  });

  it("clamps grid columns and supports section heading levels", async () => {
    const grid = await fixture(html`<shw-grid columns="9"><div>A</div></shw-grid>`);
    const section = await fixture(html`
      <shw-section heading="Details" intro="Useful context" level="3"></shw-section>
    `);

    expect(grid.shadowRoot.querySelector(".grid").classList.contains("columns-4")).to.equal(true);
    expect(section.shadowRoot.querySelector("h3").textContent).to.equal("Details");
    expect(section.shadowRoot.querySelector(".intro").textContent).to.equal("Useful context");
  });
});
