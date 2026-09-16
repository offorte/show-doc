import { aTimeout, expect, fixture, html } from "@open-wc/testing";

import "../dist/showdoc.js";

describe("rich disclosure content", () => {
  it("keeps Markdown as the default and updates its source", async () => {
    const element = await fixture(html`<shw-collapsible>First **note**.</shw-collapsible>`);
    let markdown = element.shadowRoot.querySelector("shw-markdown");
    await markdown.updateComplete;
    expect(markdown.shadowRoot.querySelector("strong").textContent).to.equal("note");

    element.textContent = "Updated *evidence*.";
    await aTimeout(0);
    await element.updateComplete;
    markdown = element.shadowRoot.querySelector("shw-markdown");
    await markdown.updateComplete;
    expect(markdown.shadowRoot.querySelector("em").textContent).to.equal("evidence");
  });

  it("preserves child components behind the native disclosure", async () => {
    const element = await fixture(html`
      <shw-collapsible summary="Source evidence" content="blocks">
        <shw-code filename="answer.ts" language="ts">const answer = 42;</shw-code>
        <shw-table caption="Checks">Check | Result Source | Confirmed</shw-table>
      </shw-collapsible>
    `);
    const code = element.querySelector("shw-code");
    const table = element.querySelector("shw-table");
    await Promise.all([code.updateComplete, table.updateComplete]);

    expect(element.shadowRoot.querySelector("shw-markdown")).to.equal(null);
    expect(element.shadowRoot.querySelector("slot").assignedElements()).to.deep.equal([
      code,
      table,
    ]);
    expect(code.shadowRoot.querySelector(".token.keyword").textContent).to.equal("const");
    expect(table.shadowRoot.querySelector("caption").textContent.trim()).to.equal("Checks");

    const details = element.shadowRoot.querySelector("details");
    expect(details.open).to.equal(false);
    details.querySelector("summary").click();
    await aTimeout(0);
    await element.updateComplete;
    expect(element.open).to.equal(true);
    expect(element.hasAttribute("open")).to.equal(true);
    expect(element.querySelector("shw-code")).to.equal(code);

    element.open = false;
    await element.updateComplete;
    expect(details.open).to.equal(false);
  });

  it("supports later child additions and changes without rebuilding them", async () => {
    const element = await fixture(html`<shw-collapsible content="blocks" open></shw-collapsible>`);
    const code = document.createElement("shw-code");
    code.textContent = "first";
    element.append(code);
    await aTimeout(0);
    await code.updateComplete;
    expect(element.shadowRoot.querySelector("slot").assignedElements()).to.deep.equal([code]);

    code.textContent = "second";
    await aTimeout(0);
    await code.updateComplete;
    expect(code.shadowRoot.querySelector("code").textContent).to.equal("second");
  });

  it("switches input modes explicitly and keeps unknown modes on the safe Markdown path", async () => {
    const element = await fixture(html`
      <shw-collapsible content="blocks"><shw-markdown>**Evidence**</shw-markdown></shw-collapsible>
    `);
    const child = element.querySelector("shw-markdown");
    element.content = "markdown";
    await element.updateComplete;
    const markdown = element.shadowRoot.querySelector("shw-markdown");
    await markdown.updateComplete;
    expect(markdown.shadowRoot.querySelector("strong").textContent).to.equal("Evidence");

    element.content = "blocks";
    await element.updateComplete;
    expect(element.shadowRoot.querySelector("slot").assignedElements()).to.deep.equal([child]);
    element.setAttribute("content", "unknown");
    element.textContent = "[Unsafe](javascript:alert(1))";
    await aTimeout(0);
    await element.updateComplete;
    const fallback = element.shadowRoot.querySelector("shw-markdown");
    await fallback.updateComplete;
    expect(fallback.shadowRoot.querySelector("a")?.getAttribute("href") ?? "").not.to.match(
      /^javascript:/iu,
    );
  });
});
