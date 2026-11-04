import { installGlobalStyles } from "./styles/install-global-styles";

// The package marks source modules as free of side effects, so the call in index.ts does not run here.
installGlobalStyles();

export * from "./index";
export { ShwMermaid } from "./components/shw-mermaid";
