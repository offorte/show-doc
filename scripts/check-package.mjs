import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const packageManifest = JSON.parse(await readFile("package.json", "utf8"));
const skillPath = "skills/show-doc/SKILL.md";
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
  readFile("examples/codebase-overview.html", "utf8"),
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

const releaseExtraFiles = releaseConfig.packages["."]["extra-files"].map(({ path }) => path);
assert.deepEqual(releaseExtraFiles, [skillPath]);

const cdnBase = `https://cdn.jsdelivr.net/npm/${packageManifest.name}@${packageManifest.version}/dist/`;
const javascriptUrl = `${cdnBase}showdoc.js`;
const mermaidJavascriptUrl = `${cdnBase}showdoc-mermaid.js`;

assert.ok(skill.includes(javascriptUrl), `Skill must use ${javascriptUrl}.`);
assert.ok(skill.includes(mermaidJavascriptUrl), `Skill must use ${mermaidJavascriptUrl}.`);
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
  releaseWorkflow.includes("uses: ./.github/workflows/pages.yml") &&
    pagesWorkflow.includes("actions/upload-pages-artifact@") &&
    pagesWorkflow.includes("actions/deploy-pages@") &&
    pagesWorkflow.includes("path: .preview"),
  "The release and Pages workflows must publish the production showcase.",
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
