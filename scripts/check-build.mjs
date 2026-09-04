import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";

const expectedTags = [
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
  "shw-mermaid",
  "shw-section",
  "shw-stat",
  "shw-steps",
  "shw-summary",
  "shw-table",
];

const files = await readdir("dist", { withFileTypes: true });
const runtimeFiles = files
  .filter((entry) => entry.isFile() && /\.(?:css|js)$/u.test(entry.name))
  .map((entry) => entry.name)
  .toSorted();

assert.deepEqual(
  runtimeFiles,
  ["showdoc-mermaid.js", "showdoc.js"],
  "The runtime must have self-contained core and Mermaid JavaScript files.",
);

const [javascript, mermaidJavascript, licenses, packageSource, javascriptStats, mermaidStats] =
  await Promise.all([
    readFile("dist/showdoc.js", "utf8"),
    readFile("dist/showdoc-mermaid.js", "utf8"),
    readFile("dist/THIRD_PARTY_LICENSES.md", "utf8"),
    readFile("package.json", "utf8"),
    stat("dist/showdoc.js"),
    stat("dist/showdoc-mermaid.js"),
  ]);
const packageManifest = JSON.parse(packageSource);

for (const tag of expectedTags) {
  assert.ok(mermaidJavascript.includes(tag), `The Mermaid bundle must register ${tag}.`);
}

for (const tagName of expectedTags.filter((elementName) => elementName !== "shw-mermaid")) {
  assert.ok(javascript.includes(tagName), `The core JS bundle must register ${tagName}.`);
}

assert.ok(
  !javascript.includes("Diagram could not be rendered"),
  "The core JS bundle must not include the Mermaid component implementation.",
);
assert.ok(!javascript.includes("import("), "The core JS bundle must not contain lazy imports.");
assert.ok(
  !mermaidJavascript.includes("import("),
  "The Mermaid JS bundle must not contain lazy imports.",
);
assert.ok(
  !javascript.includes("Lit is in dev mode") && !mermaidJavascript.includes("Lit is in dev mode"),
  "Both JS bundles must use Lit production mode.",
);
assert.deepEqual(
  packageManifest.sideEffects,
  ["./dist/showdoc.js", "./dist/showdoc-mermaid.js"],
  "Bundlers must preserve element registration and global styles.",
);
assert.equal(
  packageManifest.exports["./styles.css"],
  undefined,
  "The package must not publish a second stylesheet path.",
);
assert.ok(
  javascript.includes("--tw-prose-body"),
  "The JS bundle must contain Tailwind Typography prose rules for Shadow DOM.",
);
assert.ok(
  javascript.includes("data-shw-styles") && javascript.includes("--shw-color-page"),
  "The JS bundle must install the global ShowDoc stylesheet.",
);
for (const dependency of [
  "lit - 3.3.3",
  "mermaid - 11.17.2",
  "micromark - 4.0.2",
  "prismjs - 1.30.0",
]) {
  assert.ok(licenses.includes(dependency), `The licenses file must include ${dependency}.`);
}
assert.ok(javascriptStats.size < 185_000, "The minified core JS bundle must stay below 185 KB.");
assert.ok(mermaidStats.size < 5_500_000, "The minified Mermaid JS bundle must stay below 5.5 MB.");
await stat("dist/types/index.d.ts");
await stat("dist/types/mermaid.d.ts");

console.log(
  `Build contract passed: ${javascriptStats.size} byte core JS and ${mermaidStats.size} byte Mermaid JS.`,
);
