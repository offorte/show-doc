import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const includesMermaid = mode === "mermaid";

  return {
    plugins: [tailwindcss()],
    build: {
      lib: {
        entry: fileURLToPath(
          new URL(includesMermaid ? "./src/mermaid.ts" : "./src/index.ts", import.meta.url),
        ),
        formats: ["es"],
        fileName: () => (includesMermaid ? "showdoc-mermaid.js" : "showdoc.js"),
        cssFileName: "showdoc",
      },
      cssCodeSplit: false,
      emptyOutDir: !includesMermaid,
      license: {
        fileName: "THIRD_PARTY_LICENSES.md",
      },
      minify: "oxc",
      sourcemap: false,
      rollupOptions: {
        output: {
          codeSplitting: false,
        },
      },
    },
  };
});
