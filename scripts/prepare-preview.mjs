import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const previewRoot = resolve(".preview");
const previewDist = resolve(previewRoot, "dist");

await rm(previewRoot, { force: true, recursive: true });
await mkdir(previewDist, { recursive: true });

const showcase = await readFile("examples/codebase-overview.html", "utf8");
const publishedShowcase = showcase.replace(
  'src="../dist/showdoc-mermaid.js"',
  'src="./dist/showdoc-mermaid.js"',
);

if (publishedShowcase === showcase) {
  throw new Error("The showcase must load the local Mermaid bundle.");
}

await Promise.all([
  cp("examples", resolve(previewRoot, "examples"), { recursive: true }),
  writeFile(resolve(previewRoot, "index.html"), publishedShowcase),
  copyFile("dist/showdoc-mermaid.js", resolve(previewDist, "showdoc-mermaid.js")),
  copyFile("dist/showdoc.js", resolve(previewDist, "showdoc.js")),
]);

console.log("Prepared the local production preview in .preview/.");
