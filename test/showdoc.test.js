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

async function waitForDiagram(element, nodes, edges) {
  await waitUntil(
    () =>
      element.shadowRoot.querySelectorAll(".react-flow__node").length >= nodes &&
      element.shadowRoot.querySelectorAll(".edge .line").length >= edges,
    "The diagram did not render within 2.5 seconds.",
    { timeout: 2_500 },
  );
}

async function expectMermaidDrawing(source) {
  await import("../dist/showdoc-mermaid.js");
  const element = await fixture(html`<shw-mermaid label="Fallback"></shw-mermaid>`);
  element.textContent = source;
  await aTimeout(0);
  await waitForMermaidSvg(element);
  expect(element.shadowRoot.querySelector(".react-flow")).to.equal(null);
  expect(element.shadowRoot.querySelector(".error")).to.equal(null);
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
    expect(element.shadowRoot.querySelector("tbody tr td:last-child").textContent.trim()).to.equal(
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

  it("installs the global stylesheet from the Mermaid bundle", async () => {
    document.head.querySelector("style[data-shw-styles]")?.remove();
    await import(`../dist/showdoc-mermaid.js?styles=${Date.now()}`);

    expect(document.head.querySelector("style[data-shw-styles]")).not.to.equal(null);
  });

  it("keeps Mermaid's drawing for diagrams that ShowDoc does not draw", async () => {
    await import("../dist/showdoc-mermaid.js");
    const wrapper = await fixture(html`
      <div style="width: 800px">
        <shw-mermaid
          label="Order classes"
          style="
            --shw-color-accent-soft: #ccfbf1;
            --shw-color-border: #0f766e;
            --shw-font-sans: 'Courier New';
          "
        ></shw-mermaid>
      </div>
    `);
    const element = wrapper.querySelector("shw-mermaid");
    element.textContent = "classDiagram\nclass Order\nOrder <|-- Refund";
    await aTimeout(0);
    const svg = await waitForMermaidSvg(element);
    const node = svg.querySelector(".node path, .node rect");
    const nodeLabel = svg.querySelector(".node text, .node .nodeLabel");

    expect(element.shadowRoot.querySelector('[role="img"]').getAttribute("aria-label")).to.equal(
      "Order classes",
    );
    expect(svg.textContent).to.include("Order");
    expect(getComputedStyle(node).fill).to.equal("rgb(204, 251, 241)");
    expect(getComputedStyle(node).stroke).to.equal("rgb(15, 118, 110)");
    expect(getComputedStyle(nodeLabel).fontFamily).to.include("Courier New");
    expect(element.getBoundingClientRect().width).to.equal(wrapper.getBoundingClientRect().width);
    expect(svg.getBoundingClientRect().width).to.be.lessThan(element.getBoundingClientRect().width);
  });

  it("draws a flowchart with cards, routed lines, and the document theme", async () => {
    await import("../dist/showdoc-mermaid.js");
    const wrapper = await fixture(html`
      <div style="width: 800px">
        <shw-mermaid
          label="Release flow"
          style="
            --shw-color-border: rgb(15, 118, 110);
            --shw-color-heading: rgb(19, 78, 74);
            --shw-color-surface: rgb(204, 251, 241);
            --shw-font-sans: 'Courier New';
          "
        ></shw-mermaid>
      </div>
    `);
    const element = wrapper.querySelector("shw-mermaid");
    element.textContent = "flowchart LR\nA[Write] -->|text| B{Ready?}\nB -->|yes| C([Read])";
    await aTimeout(0);
    await waitForDiagram(element, 3, 2);
    const root = element.shadowRoot;
    const title = root.querySelector(".texts strong");

    expect(root.querySelector('[role="img"]').getAttribute("aria-label")).to.equal("Release flow");
    expect(root.querySelector(".shape-decision")).not.to.equal(null);
    expect(root.querySelector(".shape-terminal")).not.to.equal(null);
    expect([...root.querySelectorAll(".edge-pill")].map((pill) => pill.textContent)).to.deep.equal([
      "text",
      "yes",
    ]);
    expect(title.textContent).to.equal("Write");
    const card = root.querySelector(".shape-card");
    expect(getComputedStyle(card).backgroundColor).to.equal("rgb(204, 251, 241)");
    expect(getComputedStyle(card).borderTopColor).to.equal("rgb(15, 118, 110)");
    expect(getComputedStyle(title).color).to.equal("rgb(19, 78, 74)");
    expect(getComputedStyle(title).fontFamily).to.include("Courier New");
    expect(element.getBoundingClientRect().width).to.equal(wrapper.getBoundingClientRect().width);
  });

  it("draws subgraphs as lanes and shows change status", async () => {
    await import("../dist/showdoc-mermaid.js");
    const element = await fixture(html`<shw-mermaid label="Signup"></shw-mermaid>`);
    element.textContent = [
      "flowchart LR",
      "subgraph API",
      "  A[POST /signup]:::changed",
      "end",
      "subgraph Data",
      "  B[(Users)]:::new",
      "  C[Old store]:::removed",
      "end",
      "A ==>|write user| B",
      "A -.-> C",
    ].join("\n");
    await aTimeout(0);
    await waitForDiagram(element, 5, 2);
    const root = element.shadowRoot;
    const [firstLane, secondLane] = root.querySelectorAll(".lane-box");

    expect([...root.querySelectorAll(".lane-title")].map((lane) => lane.textContent)).to.deep.equal(
      ["API", "Data"],
    );
    expect(firstLane.getBoundingClientRect().right).to.be.lessThan(
      secondLane.getBoundingClientRect().left,
    );
    expect([...root.querySelectorAll(".pill")].map((pill) => pill.textContent)).to.have.members([
      "CHANGED",
      "NEW",
      "REMOVED",
    ]);
    expect(root.querySelector(".edge-pill.s-new").textContent).to.equal("write user");
    expect(root.querySelector(".edge.thick.s-new")).not.to.equal(null);
    expect(root.querySelector(".edge.dashed.s-removed")).not.to.equal(null);
  });

  it("does not route lines through cards in a lane diagram", async () => {
    await import("../dist/showdoc-mermaid.js");
    const element = await fixture(html`<shw-mermaid label="Route check"></shw-mermaid>`);
    element.textContent = [
      "flowchart LR",
      "subgraph One",
      "  A[First] --> B[Second]",
      "  B --> C[Third]",
      "  A --> C",
      "end",
    ].join("\n");
    await aTimeout(0);
    await waitForDiagram(element, 4, 3);
    const root = element.shadowRoot;
    const middle = root.querySelector('[data-id="B"]').getBoundingClientRect();
    const crossing = [...root.querySelectorAll(".edge .line")].some((line) => {
      const length = line.getTotalLength();
      const matrix = line.getScreenCTM();
      for (let distance = 0; distance <= length; distance += 4) {
        const point = line.getPointAtLength(distance).matrixTransform(matrix);
        if (
          point.x > middle.left &&
          point.x < middle.right &&
          point.y > middle.top &&
          point.y < middle.bottom
        ) {
          return true;
        }
      }
      return false;
    });

    expect(crossing).to.equal(false);
  });

  it("draws state diagrams and sequence diagrams", async () => {
    await import("../dist/showdoc-mermaid.js");
    const states = await fixture(html`<shw-mermaid label="States"></shw-mermaid>`);
    states.textContent = "stateDiagram-v2\n[*] --> Draft\nDraft --> Paid: pay\nPaid --> [*]";
    await aTimeout(0);
    await waitForDiagram(states, 4, 3);
    expect(states.shadowRoot.querySelector(".shape-start")).not.to.equal(null);
    expect(states.shadowRoot.querySelector(".shape-end")).not.to.equal(null);
    expect(states.shadowRoot.querySelector(".edge-pill").textContent).to.equal("pay");

    const sequence = await fixture(html`<shw-mermaid label="Login"></shw-mermaid>`);
    sequence.textContent = [
      "sequenceDiagram",
      "actor U as User",
      "participant A as API",
      "U->>+A: Log in",
      "A-->>-U: Token",
      "loop Every minute",
      "  U->>A: Refresh",
      "end",
    ].join("\n");
    await aTimeout(0);
    await waitUntil(() => sequence.shadowRoot.querySelector(".sequence"), "No sequence drawing.", {
      timeout: 2_500,
    });
    const text = sequence.shadowRoot.querySelector(".sequence").textContent;
    expect(text).to.include("User");
    expect(text).to.include("Log in");
    expect(text).to.include("LOOP");
    expect(sequence.shadowRoot.querySelectorAll(".activation").length).to.equal(1);
  });

  it("fills the window in page mode without a document", async () => {
    await import("../dist/showdoc-mermaid.js");
    const element = await fixture(html`<shw-mermaid page label="Alone"></shw-mermaid>`);
    element.textContent = "flowchart LR\nA --> B";
    await aTimeout(0);
    await waitForDiagram(element, 2, 1);
    const box = element.getBoundingClientRect();

    expect(box.width).to.equal(innerWidth);
    expect(box.height).to.equal(innerHeight);
    expect(element.shadowRoot.querySelector(".frame").getBoundingClientRect().height).to.equal(
      innerHeight,
    );
  });

  it("follows the document theme without drawing again", async () => {
    await import("../dist/showdoc-mermaid.js");
    const element = await fixture(html`<shw-mermaid label="Theme"></shw-mermaid>`);
    element.textContent = "flowchart LR\nA --> B";
    await aTimeout(0);
    await waitForDiagram(element, 2, 1);
    const card = element.shadowRoot.querySelector(".shape-card");
    const light = getComputedStyle(card).backgroundColor;

    document.documentElement.dataset.shwTheme = "dark";
    await aTimeout(0);
    const dark = getComputedStyle(card).backgroundColor;
    delete document.documentElement.dataset.shwTheme;

    expect(card.isConnected).to.equal(true);
    expect(dark).to.not.equal(light);
  });

  it("shows a frontmatter title with grey code and keeps author colors", async () => {
    await import("../dist/showdoc-mermaid.js");
    const element = await fixture(html`<shw-mermaid label="Title"></shw-mermaid>`);
    element.textContent = [
      "---",
      "title: Container view | overview",
      "---",
      "flowchart LR",
      "A[One] --> B[Two]",
      "style A fill:#fde68a,stroke:#b45309,color:#78350f",
      "linkStyle 0 stroke:#b45309",
    ].join("\n");
    await aTimeout(0);
    await waitForDiagram(element, 2, 1);
    const root = element.shadowRoot;
    const chip = root.querySelector(".view-chip");
    const card = root.querySelector('[data-id="A"] .shape-card');

    expect(chip.firstChild.textContent).to.equal("Container view");
    expect(chip.querySelector("code").textContent).to.equal("overview");
    expect(getComputedStyle(card).backgroundColor).to.equal("rgb(253, 230, 138)");
    expect(getComputedStyle(root.querySelector(".edge .line")).stroke).to.equal("rgb(180, 83, 9)");
  });

  it("leaves state diagram links to Mermaid", async () => {
    await expectMermaidDrawing('stateDiagram-v2\nA --> B\nclick A href "https://example.com"');
  });

  it("leaves half arrows in a sequence diagram to Mermaid", async () => {
    await expectMermaidDrawing("sequenceDiagram\nA-|\\B: Half arrow");
  });

  it("leaves central connection marks in a sequence diagram to Mermaid", async () => {
    await expectMermaidDrawing("sequenceDiagram\nA->>()B: Central");
  });

  it("expands a drawn diagram over the full window and closes again", async () => {
    await import("../dist/showdoc-mermaid.js");
    const element = await fixture(html`<shw-mermaid label="Expandable"></shw-mermaid>`);
    element.textContent = "flowchart LR\nA --> B";
    await aTimeout(0);
    await waitForDiagram(element, 2, 1);
    const root = element.shadowRoot;

    root.querySelector('[aria-label="Expand diagram"]').click();
    await waitUntil(
      () => root.querySelectorAll(".overlay-canvas .react-flow__node").length === 2,
      "The overlay did not draw the diagram.",
      { timeout: 2_500 },
    );
    const dialog = root.querySelector(".overlay");
    const box = dialog.getBoundingClientRect();

    expect(dialog.open).to.equal(true);
    expect(box.width).to.equal(innerWidth);
    expect(box.height).to.equal(innerHeight);
    expect(root.querySelector('.overlay [aria-label="Zoom in"]')).not.to.equal(null);
    expect(root.querySelector('.overlay [aria-label="Expand diagram"]')).to.equal(null);

    root.querySelector('[aria-label="Close diagram"]').click();
    await element.updateComplete;

    expect(dialog.open).to.equal(false);
    expect(root.querySelector(".overlay-canvas")).to.equal(null);
    expect(root.querySelectorAll(".canvas .react-flow__node").length).to.equal(2);
  });

  it("keeps the inline zoom when the overlay hides a classic scrollbar", async () => {
    await import("../dist/showdoc-mermaid.js");
    const scrollbar = document.createElement("style");
    scrollbar.textContent = "::-webkit-scrollbar { width: 15px; }";
    document.head.append(scrollbar);
    const wrapper = await fixture(html`
      <div style="height: 300vh"><shw-mermaid label="Zoomed"></shw-mermaid></div>
    `);
    const element = wrapper.querySelector("shw-mermaid");
    element.textContent = "flowchart LR\nA --> B";
    await aTimeout(0);
    await waitForDiagram(element, 2, 1);
    const root = element.shadowRoot;
    const viewport = root.querySelector(".canvas .react-flow__viewport");
    root.querySelector('[aria-label="Zoom out"]').click();
    await waitUntil(() => viewport.style.transform.includes("scale(0."), "No zoom.", {
      timeout: 2_500,
    });
    const zoomed = viewport.style.transform;
    const width = root.querySelector(".frame").getBoundingClientRect().width;

    root.querySelector('[aria-label="Expand diagram"]').click();
    await waitUntil(() => root.querySelector(".overlay-canvas .react-flow__node"), "No overlay.", {
      timeout: 2_500,
    });
    const openWidth = root.querySelector(".frame").getBoundingClientRect().width;
    root.querySelector('[aria-label="Close diagram"]').click();
    await element.updateComplete;
    await aTimeout(100);
    scrollbar.remove();

    expect(openWidth).to.equal(width);
    expect(viewport.style.transform).to.equal(zoomed);
  });

  it("returns the page to its scroll position after the overlay closes", async () => {
    await import("../dist/showdoc-mermaid.js");
    const wrapper = await fixture(html`
      <div style="height: 300vh"><shw-mermaid label="Scrolled"></shw-mermaid></div>
    `);
    const element = wrapper.querySelector("shw-mermaid");
    element.textContent = "flowchart LR\nA --> B";
    await aTimeout(0);
    await waitForDiagram(element, 2, 1);
    const root = element.shadowRoot;
    scrollTo(0, 120);

    root.querySelector('[aria-label="Expand diagram"]').click();
    await waitUntil(() => root.querySelector(".overlay").open, "No overlay.", { timeout: 2_500 });
    scrollTo(0, 500);
    root.querySelector('[aria-label="Close diagram"]').click();
    await element.updateComplete;
    const position = scrollY;
    scrollTo(0, 0);

    expect(position).to.equal(120);
  });

  it("expands a Mermaid drawing and closes when the dialog closes by itself", async () => {
    await import("../dist/showdoc-mermaid.js");
    const element = await fixture(html`<shw-mermaid label="Classes"></shw-mermaid>`);
    element.textContent = "classDiagram\nclass Order";
    await aTimeout(0);
    await waitForMermaidSvg(element);
    const root = element.shadowRoot;

    root.querySelector('[aria-label="Expand diagram"]').click();
    await waitUntil(() => root.querySelector(".overlay .diagram svg"), "No overlay drawing.", {
      timeout: 2_500,
    });
    const dialog = root.querySelector(".overlay");
    const drawing = root.querySelector(".overlay .diagram svg").getBoundingClientRect();

    expect(drawing.width).to.be.greaterThan(innerWidth * 0.8);

    dialog.close();
    await waitUntil(() => root.querySelector(".overlay .diagram") === null, "Overlay stayed.", {
      timeout: 2_500,
    });
  });

  it("closes the overlay when the source changes", async () => {
    await import("../dist/showdoc-mermaid.js");
    const element = await fixture(html`<shw-mermaid label="Changing"></shw-mermaid>`);
    element.textContent = "flowchart LR\nA --> B";
    await aTimeout(0);
    await waitForDiagram(element, 2, 1);
    const root = element.shadowRoot;
    root.querySelector('[aria-label="Expand diagram"]').click();
    await waitUntil(() => root.querySelector(".overlay-canvas"), "No overlay.", { timeout: 2_500 });

    element.textContent = "flowchart LR\nC --> D";
    await waitUntil(() => !root.querySelector(".overlay").open, "Overlay stayed open.", {
      timeout: 2_500,
    });
    await waitUntil(
      () => [...root.querySelectorAll(".texts strong")].some((title) => title.textContent === "D"),
      "The new source did not draw.",
      { timeout: 2_500 },
    );
  });

  it("switches the theme from page mode", async () => {
    await import("../dist/showdoc-mermaid.js");
    const element = await fixture(html`<shw-mermaid page label="Alone"></shw-mermaid>`);
    element.textContent = "flowchart LR\nA --> B";
    await aTimeout(0);
    await waitForDiagram(element, 2, 1);
    const root = element.shadowRoot;
    const card = root.querySelector(".shape-card");
    const light = getComputedStyle(card).backgroundColor;

    root.querySelector('[aria-label="Switch light and dark"]').click();
    const dark = getComputedStyle(card).backgroundColor;
    const darkTheme = document.documentElement.dataset.shwTheme;
    root.querySelector('[aria-label="Switch light and dark"]').click();
    const lightTheme = document.documentElement.dataset.shwTheme;
    delete document.documentElement.dataset.shwTheme;

    expect(dark).to.not.equal(light);
    expect(darkTheme).to.equal("dark");
    expect(lightTheme).to.equal("light");
  });

  it("keeps the overlay open when its theme button redraws a Mermaid drawing", async () => {
    await import("../dist/showdoc-mermaid.js");
    const element = await fixture(html`<shw-mermaid label="Classes"></shw-mermaid>`);
    element.textContent = "classDiagram\nclass Order";
    await aTimeout(0);
    await waitForMermaidSvg(element);
    const root = element.shadowRoot;
    root.querySelector('[aria-label="Expand diagram"]').click();
    await waitUntil(
      () => root.querySelector(".overlay .diagram .node path, .overlay .diagram .node rect"),
      "No overlay drawing.",
      {
        timeout: 2_500,
      },
    );
    const overlayFill = () => {
      const node = root.querySelector(".overlay .diagram .node path, .overlay .diagram .node rect");
      return node === null ? "" : getComputedStyle(node).fill;
    };
    const lightFill = overlayFill();

    root.querySelector('.overlay [aria-label="Switch light and dark"]').click();
    await waitUntil(
      () => overlayFill() !== "" && overlayFill() !== lightFill,
      "The overlay did not draw the new theme colors.",
      { timeout: 2_500 },
    );
    const stayedOpen = root.querySelector(".overlay").open;
    delete document.documentElement.dataset.shwTheme;
    root.querySelector('[aria-label="Close diagram"]').click();

    expect(stayedOpen).to.equal(true);
  });

  it("has no expand button in page mode", async () => {
    await import("../dist/showdoc-mermaid.js");
    const element = await fixture(html`<shw-mermaid page label="Alone"></shw-mermaid>`);
    element.textContent = "flowchart LR\nA --> B";
    await aTimeout(0);
    await waitForDiagram(element, 2, 1);

    expect(element.shadowRoot.querySelector('[aria-label="Expand diagram"]')).to.equal(null);
    expect(element.shadowRoot.querySelector(".overlay")).to.equal(null);
  });

  it("shows a message for invalid source", async () => {
    await import("../dist/showdoc-mermaid.js");
    const element = await fixture(html`<shw-mermaid label="Broken"></shw-mermaid>`);
    element.textContent = "flowchart LR\nA[oops -->";
    await aTimeout(0);
    await waitUntil(() => element.shadowRoot.querySelector(".error"), "No error message.", {
      timeout: 2_500,
    });
    expect(element.shadowRoot.querySelector(".react-flow")).to.equal(null);
  });

  it("draws labels as text so markup in a label cannot run", async () => {
    await import("../dist/showdoc-mermaid.js");
    const element = await fixture(html`<shw-mermaid label="Unsafe label"></shw-mermaid>`);
    element.textContent = 'flowchart LR\nA["<img src=x onerror=alert(1)>Safe"] --> B[Next]';
    await aTimeout(0);
    await waitForDiagram(element, 2, 1);

    expect(element.shadowRoot.querySelector("img, script, iframe, object, embed")).to.equal(null);
    expect(element.shadowRoot.querySelector("[onerror]")).to.equal(null);
    expect(element.shadowRoot.querySelector(".texts strong").textContent).to.equal("Safe");
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
