import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const packageManifest = JSON.parse(await readFile("package.json", "utf8"));
const skillPath = "skills/show-doc/SKILL.md";
const showcasePath = "examples/codebase-overview.html";
const [
  readme,
  releaseConfigSource,
  releaseManifestSource,
  releaseWorkflow,
  pagesWorkflow,
  showcase,
  skill,
] = await Promise.all([
  readFile("README.md", "utf8"),
  readFile("release-please-config.json", "utf8"),
  readFile(".release-please-manifest.json", "utf8"),
  readFile(".github/workflows/release.yml", "utf8"),
  readFile(".github/workflows/pages.yml", "utf8"),
  readFile(showcasePath, "utf8"),
  readFile(skillPath, "utf8"),
]);
const releaseConfig = JSON.parse(releaseConfigSource);
const releaseManifest = JSON.parse(releaseManifestSource);

assert.equal(packageManifest.name, "@offorte/show-doc");
assert.equal(packageManifest.publishConfig.access, "public");
assert.equal(packageManifest.exports["./skill"], `./${skillPath}`);
assert.equal(packageManifest.exports["./styles.css"], undefined);
assert.deepEqual(packageManifest.dependencies, { lit: "3.3.3" });
assert.ok(skill.includes(`version: "${packageManifest.version}"`), "Skill version must match npm.");
assert.equal(releaseManifest["."], packageManifest.version);
assert.equal(releaseConfig.packages["."]["package-name"], packageManifest.name);
assert.deepEqual(releaseConfig["changelog-sections"], [
  { type: "feat", section: "Features" },
  { type: "feature", section: "Features" },
  { type: "fix", section: "Bug Fixes" },
  { type: "opt", section: "Optimizations" },
  { type: "perf", section: "Performance Improvements" },
  { type: "revert", section: "Reverts" },
  { type: "docs", section: "Documentation", hidden: true },
  { type: "style", section: "Styles", hidden: true },
  { type: "chore", section: "Miscellaneous Chores", hidden: true },
  { type: "refactor", section: "Code Refactoring", hidden: true },
  { type: "test", section: "Tests", hidden: true },
  { type: "build", section: "Build System", hidden: true },
  { type: "ci", section: "Continuous Integration", hidden: true },
]);

const releaseExtraFiles = releaseConfig.packages["."]["extra-files"].map(({ path }) => path);
assert.deepEqual(releaseExtraFiles, [skillPath, showcasePath]);

const cdnBase = `https://cdn.jsdelivr.net/npm/${packageManifest.name}@${packageManifest.version}/dist/`;
const javascriptUrl = `${cdnBase}showdoc.js`;
const mermaidJavascriptUrl = `${cdnBase}showdoc-mermaid.js`;
const showcaseHead = showcase.slice(showcase.indexOf("<head>"), showcase.indexOf("</head>"));

assert.ok(skill.includes(javascriptUrl), `Skill must use ${javascriptUrl}.`);
assert.ok(skill.includes(mermaidJavascriptUrl), `Skill must use ${mermaidJavascriptUrl}.`);
assert.ok(
  showcaseHead.includes(`src="${mermaidJavascriptUrl}"`),
  `Showcase head must use ${mermaidJavascriptUrl}.`,
);
assert.ok(showcase.includes(javascriptUrl), `Showcase example must use ${javascriptUrl}.`);
for (const [name, source] of [
  ["skill", skill],
  ["showcase", showcase],
]) {
  const cdnVersions = [
    ...source.matchAll(
      /https:\/\/cdn\.jsdelivr\.net\/npm\/@offorte\/show-doc@([^/]+)\/dist\/showdoc(?:-mermaid)?\.js/gu,
    ),
  ].map((match) => match[1]);

  assert.ok(cdnVersions.length > 0, `${name} must contain a ShowDoc CDN URL.`);
  assert.ok(
    cdnVersions.every((version) => version === packageManifest.version),
    `${name} CDN URLs must use ${packageManifest.version}.`,
  );
}
assert.ok(!skill.includes("showdoc.css"), "The public skill must use the one-script setup.");
for (const [name, source] of [
  ["README", readme],
  ["skill", skill],
  ["showcase", showcase],
]) {
  assert.ok(
    !source.includes("Content-Security-Policy"),
    `${name} must not document a CSP contract.`,
  );
  assert.ok(!source.includes("data-shw-theme"), `${name} must not document the private theme API.`);
  assert.ok(!source.includes("--shw-"), `${name} must not document private theme variables.`);
}
assert.ok(
  readme.includes("https://offorte.github.io/show-doc/"),
  "README must link to the GitHub Pages showcase.",
);
assert.ok(
  releaseWorkflow.startsWith("name: Release package\n") &&
    releaseWorkflow.includes("name: Prepare GitHub release") &&
    releaseWorkflow.includes("name: Publish package to npm") &&
    releaseWorkflow.includes("name: Deploy released Pages site") &&
    releaseWorkflow.includes("- publish_package") &&
    releaseWorkflow.includes("uses: ./.github/workflows/pages.yml") &&
    releaseWorkflow.includes("ref: ${{ needs.prepare_release.outputs.tag_name }}") &&
    pagesWorkflow.startsWith("name: Deploy Pages\n") &&
    pagesWorkflow.includes("name: Deploy ShowDoc example") &&
    pagesWorkflow.includes("actions/upload-pages-artifact@") &&
    pagesWorkflow.includes("actions/deploy-pages@") &&
    pagesWorkflow.includes("path: .preview"),
  "A successful package release must deploy the versioned production showcase.",
);

const npmCache = await mkdtemp(join(tmpdir(), "show-doc-npm-cache-"));
let packResult;

try {
  packResult = spawnSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache: npmCache,
    },
  });
} finally {
  await rm(npmCache, { force: true, recursive: true });
}

assert.equal(packResult.status, 0, packResult.stderr || "npm pack failed.");

const [pack] = JSON.parse(packResult.stdout);
const packedFiles = pack.files.map((file) => file.path);
const requiredFiles = [
  "LICENSE",
  "README.md",
  "custom-elements.json",
  "dist/THIRD_PARTY_LICENSES.md",
  "dist/showdoc-mermaid.js",
  "dist/showdoc.js",
  "dist/types/index.d.ts",
  "dist/types/mermaid.d.ts",
  "dist/types/shw-tone.d.ts",
  "package.json",
  skillPath,
];

for (const file of requiredFiles) {
  assert.ok(packedFiles.includes(file), `npm package must contain ${file}.`);
}

const manifest = JSON.parse(await readFile("custom-elements.json", "utf8"));

for (const module of manifest.modules) {
  assert.match(module.path, /^dist\/.+\.js$/u, "Manifest modules must be published JavaScript.");
  assert.ok(packedFiles.includes(module.path), `npm package must contain ${module.path}.`);
}

const privatePrefixes = [
  ".github/",
  ".preview/",
  "demo/",
  "examples/",
  "scripts/",
  "src/",
  "test/",
  "dist/types/internal/",
  "dist/types/styles/",
];

for (const prefix of privatePrefixes) {
  assert.ok(
    packedFiles.every((file) => !file.startsWith(prefix)),
    `npm package must not contain ${prefix}`,
  );
}

assert.ok(
  packedFiles.every((file) => !file.endsWith(".map")),
  "npm package must not contain declaration maps.",
);

assert.equal(pack.name, packageManifest.name);
assert.equal(pack.version, packageManifest.version);

console.log(
  `Package contract passed with ${packedFiles.length} files for ${pack.name}@${pack.version}.`,
);
