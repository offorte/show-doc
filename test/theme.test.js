import { expect, fixture, html } from "@open-wc/testing";

import "../dist/showdoc.js";

describe("ShowDoc composed layouts", () => {
  it("stacks a grid when its own container is narrow", async () => {
    const wrapper = await fixture(html`
      <div style="width: 320px">
        <shw-grid columns="3">
          <div>First item</div>
          <div>Second item</div>
          <div>Third item</div>
        </shw-grid>
      </div>
    `);
    const grid = wrapper.querySelector("shw-grid");
    await grid.updateComplete;
    const [first, second] = grid.children;

    expect(second.getBoundingClientRect().top).to.be.greaterThan(
      first.getBoundingClientRect().bottom,
    );

    wrapper.style.width = "960px";

    expect(second.getBoundingClientRect().top).to.equal(first.getBoundingClientRect().top);
    expect(second.getBoundingClientRect().left).to.be.greaterThan(
      first.getBoundingClientRect().right,
    );
  });

  it("keeps section introductions inside narrow composed layouts", async () => {
    const wrapper = await fixture(html`
      <div style="width: 320px">
        <shw-section
          heading="Compare the options"
          intro="Keep the explanation beside its evidence when there is enough room."
        ></shw-section>
      </div>
    `);
    const section = wrapper.querySelector("shw-section");
    await section.updateComplete;
    const heading = section.shadowRoot.querySelector(".heading");
    const intro = section.shadowRoot.querySelector(".intro");

    expect(intro.getBoundingClientRect().top).to.be.greaterThan(
      heading.getBoundingClientRect().bottom,
    );
    expect(intro.getBoundingClientRect().right).to.be.at.most(
      section.getBoundingClientRect().right,
    );

    wrapper.style.width = "960px";

    expect(intro.getBoundingClientRect().left).to.be.greaterThan(
      heading.getBoundingClientRect().right,
    );
  });
});
