import { aTimeout, expect, fixture, html, waitUntil } from "@open-wc/testing";

import "../dist/showdoc.js";

const tallSection = (heading) =>
  html`<shw-section heading=${heading} style="height: 1500px"></shw-section>`;

const docWithSections = (count) =>
  fixture(html`
    <shw-doc
      >${Array.from({ length: count }, (_, index) => tallSection(`Part ${index + 1}`))}</shw-doc
    >
  `);

const menuOf = (doc) => doc.shadowRoot.querySelector("nav.menu");
const linksOf = (doc) => [...doc.shadowRoot.querySelectorAll(".links a")];
const currentLabel = (doc) =>
  doc.shadowRoot.querySelector('.links a[aria-current="location"] .label')?.textContent ?? "";

const scheme = () => getComputedStyle(document.documentElement).colorScheme;

async function scrollToStop() {
  let position;
  do {
    position = scrollY;
    await aTimeout(250);
  } while (position !== scrollY);
}

describe("shw-doc section menu", () => {
  afterEach(() => {
    scrollTo({ top: 0, behavior: "instant" });
  });

  it("stays hidden for three sections and appears for four", async () => {
    const doc = await docWithSections(3);
    expect(menuOf(doc)).to.equal(null);

    doc.append(Object.assign(document.createElement("shw-section"), { id: "added" }));
    doc.lastElementChild.setAttribute("heading", "Added");
    await waitUntil(() => menuOf(doc), "The menu did not appear for a fourth section.");

    expect(linksOf(doc).map((link) => link.getAttribute("href"))).to.deep.equal([
      "#part-1",
      "#part-2",
      "#part-3",
      "#added",
    ]);
  });

  it("links only to main sections and keeps author and unique ids", async () => {
    const doc = await fixture(html`
      <shw-doc>
        <shw-section heading="Top"></shw-section>
        <shw-section heading="Same name"></shw-section>
        <shw-section heading="Same name"></shw-section>
        <shw-section heading="Mine" id="my-id"></shw-section>
        <shw-section heading="Small" level="3"></shw-section>
        <shw-section></shw-section>
        <shw-grid><shw-section heading="Nested"></shw-section></shw-grid>
      </shw-doc>
    `);
    await doc.updateComplete;

    expect(linksOf(doc).map((link) => link.getAttribute("href"))).to.deep.equal([
      "#top-2",
      "#same-name",
      "#same-name-2",
      "#my-id",
    ]);
  });

  it("can be turned off", async () => {
    const doc = await fixture(html`
      <shw-doc nav="off">${["A", "B", "C", "D"].map(tallSection)}</shw-doc>
    `);
    await doc.updateComplete;
    expect(menuOf(doc)).to.equal(null);

    doc.nav = "auto";
    await doc.updateComplete;
    expect(menuOf(doc)).not.to.equal(null);
  });

  it("marks the section that the reader has reached", async () => {
    const doc = await docWithSections(4);
    await aTimeout(50);
    expect(currentLabel(doc)).to.equal("Part 1");

    const top = doc.querySelector("#part-3").getBoundingClientRect().top + scrollY;
    scrollTo({ top, behavior: "instant" });
    await waitUntil(() => currentLabel(doc) === "Part 3", "Part 3 did not become current.");

    scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
    await waitUntil(() => currentLabel(doc) === "Part 4", "The page end did not select Part 4.");
  });

  it("selects a short last section at the end of the page", async () => {
    const doc = await fixture(html`
      <shw-doc>
        ${tallSection("A")} ${tallSection("B")}
        <shw-section heading="Short one"></shw-section>
        <shw-section heading="Short two"></shw-section>
      </shw-doc>
    `);
    await doc.updateComplete;

    scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
    await waitUntil(() => currentLabel(doc) === "Short two", "The page end did not select it.");
  });

  it("goes back to the top and clears the current section", async () => {
    const doc = await docWithSections(4);
    await doc.updateComplete;
    scrollTo({ top: 2000, behavior: "instant" });
    await waitUntil(() => currentLabel(doc) !== "Part 1", "The page did not scroll down.");

    doc.shadowRoot.querySelector(".actions a").click();
    await scrollToStop();
    const position = scrollY;
    history.replaceState(null, "", location.pathname + location.search);

    expect(position).to.equal(0);
    expect(currentLabel(doc)).to.equal("");
  });

  it("keeps a clicked section current when it cannot reach the active line", async () => {
    const doc = await fixture(html`
      <shw-doc>
        ${tallSection("A")} ${tallSection("B")}
        <shw-section heading="Short one"></shw-section>
        <shw-section heading="Short two"></shw-section>
      </shw-doc>
    `);
    await doc.updateComplete;

    linksOf(doc)[2].click();
    await aTimeout(50);
    expect(currentLabel(doc)).to.equal("Short one");
    expect(location.hash).to.equal("#short-one");
    await scrollToStop();
    expect(doc.querySelector("#short-one").getBoundingClientRect().top).to.be.below(innerHeight);
    expect(currentLabel(doc)).to.equal("Short one");
    history.replaceState(null, "", location.pathname + location.search);
  });

  it("switches the page theme", async () => {
    const doc = await docWithSections(4);
    await doc.updateComplete;
    const button = doc.shadowRoot.querySelector(".actions button");

    button.click();
    const dark = [document.documentElement.dataset.shwTheme, scheme()];
    button.click();
    const light = [document.documentElement.dataset.shwTheme, scheme()];
    delete document.documentElement.dataset.shwTheme;

    expect(dark).to.deep.equal(["dark", "dark"]);
    expect(light).to.deep.equal(["light", "light"]);
  });

  it("puts numbered links first and keeps top and theme on one line", async () => {
    const doc = await docWithSections(4);
    await doc.updateComplete;
    const [link] = linksOf(doc);
    const mark = link.querySelector(".mark").getBoundingClientRect();
    const label = link.querySelector(".label").getBoundingClientRect();
    const top = doc.shadowRoot.querySelector(".actions a").getBoundingClientRect();
    const theme = doc.shadowRoot.querySelector(".actions .theme");

    expect(link.querySelector(".number").textContent).to.equal("1");
    expect(mark.left).to.be.below(label.left);
    expect(theme.getBoundingClientRect().top).to.equal(top.top);
    expect(theme.querySelector(".label")).to.equal(null);
    expect(theme.getAttribute("aria-label")).to.equal("Switch light and dark");
  });

  it("closes the opened menu with Escape, an outside press, or a link", async () => {
    const doc = await docWithSections(4);
    await doc.updateComplete;
    const toggle = doc.shadowRoot.querySelector(".toggle");
    const isOpen = async () => {
      await doc.updateComplete;
      return toggle.getAttribute("aria-expanded") === "true";
    };

    toggle.click();
    expect(await isOpen()).to.equal(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(await isOpen()).to.equal(false);

    toggle.click();
    toggle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
    expect(await isOpen()).to.equal(true);
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(await isOpen()).to.equal(false);

    toggle.click();
    linksOf(doc)[0].click();
    expect(await isOpen()).to.equal(false);
    history.replaceState(null, "", location.pathname + location.search);
  });
});
