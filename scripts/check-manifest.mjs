import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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

const manifest = JSON.parse(await readFile("custom-elements.json", "utf8"));
const packageManifest = JSON.parse(await readFile("package.json", "utf8"));
const expectedModules = [
  packageManifest.exports["."].import.slice(2),
  packageManifest.exports["./mermaid"].import.slice(2),
];

assert.deepEqual(
  manifest.modules.map((module) => module.path),
  expectedModules,
  "The manifest must describe the published JavaScript entry points.",
);

const declarations = manifest.modules.flatMap((module) => module.declarations ?? []);
const definitions = manifest.modules.flatMap((module) =>
  (module.exports ?? []).filter((entry) => entry.kind === "custom-element-definition"),
);

for (const tag of expectedTags) {
  assert.equal(
    declarations.filter((declaration) => declaration.tagName === tag).length,
    1,
    `The manifest must describe ${tag} once.`,
  );
  assert.equal(
    definitions.filter((definition) => definition.name === tag).length,
    1,
    `The manifest must define ${tag} once.`,
  );
}

assert.ok(
  declarations.every((declaration) =>
    (declaration.members ?? []).every(
      (member) => member.privacy !== "private" && member.privacy !== "protected",
    ),
  ),
  "The public manifest must not expose private or protected members.",
);
assert.ok(
  declarations
    .find((declaration) => declaration.tagName === "shw-markdown")
    ?.members?.every((member) => member.name !== "source"),
  "The internal Markdown source bridge must not be public.",
);
assert.ok(
  declarations.some((declaration) => (declaration.slots ?? []).length > 0),
  "The manifest must describe public slots.",
);
assert.ok(
  declarations.every((declaration) => declaration.cssProperties === undefined),
  "Theme variables are not public API yet.",
);

console.log(`Custom Elements Manifest passed with ${expectedTags.length} public elements.`);
