import { aTimeout, expect, fixture, html } from "@open-wc/testing";

import "../dist/showdoc.js";

async function setSource(element, source) {
  element.textContent = source;
  await aTimeout(0);
  await element.updateComplete;
}

describe("ShowDoc code views", () => {
  it("preserves plain code, filenames, unknown languages, and escaped source", async () => {
    const element = await fixture(
      html`<shw-code filename="unsafe.txt" language="unknown"></shw-code>`,
    );
    const source = '<script>window.codeViewUnsafe = true</script>\nconst text = "<&>";';
    await setSource(element, source);

    expect(element.shadowRoot.querySelector("code").textContent).to.equal(source);
    expect(element.shadowRoot.querySelector("figcaption").textContent).to.include("unsafe.txt");
    expect(element.shadowRoot.querySelector(".code-line")).to.equal(null);
    expect(element.shadowRoot.querySelector("script")).to.equal(null);
    expect(window.codeViewUnsafe).not.to.equal(true);
  });

  it("adds line numbers and focused ranges without changing copied code text", async () => {
    const element = await fixture(
      html`<shw-code language="js" line-numbers highlight="2,4-5"></shw-code>`,
    );
    const source = 'const one = 1;\nconst two = 2;\n\nconst four = 4;\nconst five = "<safe>";';
    await setSource(element, source);
    const lines = [...element.shadowRoot.querySelectorAll(".code-line")];

    expect(element.shadowRoot.querySelector("code").textContent).to.equal(source);
    expect(lines).to.have.length(5);
    expect(lines.map((line) => line.classList.contains("focused"))).to.deep.equal([
      false,
      true,
      false,
      true,
      true,
    ]);
    expect(lines[4].querySelector(".line-number").dataset.number).to.equal("5");
    expect(lines[4].querySelector(".line-number").getAttribute("aria-hidden")).to.equal("true");
    expect(element.shadowRoot.querySelector("figcaption").textContent).to.include("Source lines");
  });

  it("preserves full-source highlighting across multiline comments and template strings", async () => {
    const element = await fixture(html`<shw-code language="js" line-numbers></shw-code>`);
    const source = "/* start\nstill a comment\nend */\nconst text = `first\nsecond ${42}`;";
    await setSource(element, source);
    const lines = [...element.shadowRoot.querySelectorAll(".code-line")];

    expect(element.shadowRoot.querySelector("code").textContent).to.equal(source);
    expect(lines[1].querySelector(".token.comment").textContent).to.equal("still a comment");
    expect(lines[2].querySelector(".token.comment").textContent).to.equal("end */");
    expect(lines[4].querySelector(".token.template-string .token.string").textContent).to.equal(
      "second ",
    );
    expect(lines[4].querySelector(".token.number").textContent).to.equal("42");
  });

  it("keeps diff headers separate from changes, including triple prefixes inside hunks", async () => {
    const element = await fixture(html`<shw-code language="diff" line-numbers></shw-code>`);
    const source = [
      "--- a/example.txt",
      "+++ b/example.txt",
      "@@ -1,2 +1,2 @@",
      "--- old content",
      "+++ new content",
      " unchanged",
      "--- a/second.txt",
      "+++ b/second.txt",
      "@@ -0,0 +1 @@",
      '+<img src=x onerror="window.diffUnsafe=true">',
      "\\ No newline at end of file",
    ].join("\n");
    await setSource(element, source);
    const lines = [...element.shadowRoot.querySelectorAll(".code-line")];

    expect(element.shadowRoot.querySelector("code").textContent).to.equal(source);
    expect(lines[0].classList.contains("metadata")).to.equal(true);
    expect(lines[2].classList.contains("hunk")).to.equal(true);
    expect(lines[3].classList.contains("removed")).to.equal(true);
    expect(lines[4].classList.contains("added")).to.equal(true);
    expect(lines[6].classList.contains("metadata")).to.equal(true);
    expect(lines[9].classList.contains("added")).to.equal(true);
    expect(lines[10].classList.contains("metadata")).to.equal(true);
    expect(element.shadowRoot.querySelector("img")).to.equal(null);
    expect(window.diffUnsafe).not.to.equal(true);
  });

  it("renders numbered safe Markdown notes with source ranges outside the code scroller", async () => {
    const element = await fixture(html`<shw-code language="js" line-numbers></shw-code>`);
    const source = "const first = 1;\nconst second = 2;\nreturn first + second;";
    element.annotations = JSON.stringify([
      { start: 2, end: 3, text: "**Why:** keep the sum." },
      { start: 2, text: "<script>window.noteUnsafe=true</script>\n\n[Bad](javascript:alert(1))" },
    ]);
    await setSource(element, source);
    const notes = [...element.shadowRoot.querySelectorAll(".notes li")];
    const markdowns = notes.map((note) => note.querySelector("shw-markdown"));
    await Promise.all(markdowns.map((markdown) => markdown.updateComplete));

    expect(element.shadowRoot.querySelector("code").textContent).to.equal(source);
    expect(
      element.shadowRoot.querySelectorAll(".code-line:nth-of-type(2) .note-marker"),
    ).to.have.length(2);
    expect(notes[0].querySelector(".note-lines").textContent).to.equal("Source lines 2–3");
    expect(notes[1].querySelector(".note-lines").textContent).to.equal("Source line 2");
    expect(markdowns[0].shadowRoot.querySelector("strong").textContent).to.equal("Why:");
    expect(markdowns[1].shadowRoot.querySelector("script")).to.equal(null);
    expect(markdowns[1].shadowRoot.querySelector("a").getAttribute("href") ?? "").not.to.match(
      /^javascript:/iu,
    );
    expect(window.noteUnsafe).not.to.equal(true);
    expect(element.shadowRoot.querySelector("pre .notes")).to.equal(null);
    expect(getComputedStyle(element.shadowRoot.querySelector(".notes")).display).not.to.equal(
      "none",
    );
  });

  it("shows author feedback for malformed JSON and invalid or unbounded source ranges", async () => {
    const element = await fixture(
      html`<shw-code highlight="1-99999999999999999999" annotations="{oops}"></shw-code>`,
    );
    await setSource(element, "keep this source");

    expect(element.shadowRoot.querySelectorAll('[role="alert"]')).to.have.length(2);
    expect(element.shadowRoot.querySelector(".focused")).to.equal(null);
    expect(element.shadowRoot.querySelector(".notes")).to.equal(null);
    expect(element.shadowRoot.querySelector("code").textContent).to.equal("keep this source");
  });

  for (const [label, annotations] of [
    ["a non-array", "{}"],
    ["a zero line", '[{"start":0,"text":"Zero"}]'],
    ["a null endpoint", '[{"start":1,"end":null,"text":"Null"}]'],
    ["a missing line", '[{"start":1,"end":2,"text":"Outside"}]'],
    ["empty note text", '[{"start":1,"text":""}]'],
    ["a string line", '[{"start":"1","text":"Wrong type"}]'],
    ["a fractional line", '[{"start":1.5,"text":"Fraction"}]'],
  ]) {
    it(`rejects annotations with ${label}`, async () => {
      const element = await fixture(html`<shw-code>keep this source</shw-code>`);
      element.annotations = annotations;
      await element.updateComplete;
      expect(element.shadowRoot.querySelectorAll('[role="alert"]')).to.have.length(1);
      expect(element.shadowRoot.querySelector(".notes")).to.equal(null);
      expect(element.shadowRoot.querySelector("code").textContent).to.equal("keep this source");
    });
  }

  it("revalidates notes when source changes and recovers after correcting attributes", async () => {
    const element = await fixture(html`<shw-code highlight="2"></shw-code>`);
    element.annotations = '[{"start":2,"text":"Second line"}]';
    await setSource(element, "first\nsecond");
    expect(element.shadowRoot.querySelectorAll(".notes li")).to.have.length(1);

    await setSource(element, "first");
    expect(element.shadowRoot.querySelectorAll('[role="alert"]')).to.have.length(2);
    expect(element.shadowRoot.querySelector(".notes")).to.equal(null);

    element.highlight = "1";
    element.annotations = '[{"start":1,"text":"First line"}]';
    await element.updateComplete;
    expect(element.shadowRoot.querySelector('[role="alert"]')).to.equal(null);
    expect(element.shadowRoot.querySelectorAll(".focused")).to.have.length(1);
    expect(element.shadowRoot.querySelectorAll(".notes li")).to.have.length(1);

    element.highlight = "";
    element.annotations = "";
    await element.updateComplete;
    expect(element.shadowRoot.querySelector(".code-line")).to.equal(null);
    expect(element.shadowRoot.querySelector("code").textContent).to.equal("first");
  });

  it("keeps empty code empty and rejects references to nonexistent lines", async () => {
    const element = await fixture(
      html`<shw-code
        line-numbers
        highlight="1"
        annotations='[{"start":1,"text":"Missing"}]'
      ></shw-code>`,
    );

    expect(element.shadowRoot.querySelector("code").textContent).to.equal("");
    expect(element.shadowRoot.querySelectorAll(".code-line")).to.have.length(0);
    expect(element.shadowRoot.querySelectorAll('[role="alert"]')).to.have.length(2);
  });
});
