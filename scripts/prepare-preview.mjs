import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const previewRoot = resolve(".preview");

await rm(previewRoot, { force: true, recursive: true });
await mkdir(previewRoot, { recursive: true });

await Promise.all([
  cp("examples", resolve(previewRoot, "examples"), { recursive: true }),
  copyFile("examples/codebase-overview.html", resolve(previewRoot, "index.html")),
]);

console.log("Prepared the CDN-backed production preview in .preview/.");
