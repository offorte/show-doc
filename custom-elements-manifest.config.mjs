const coreModulePath = "dist/showdoc.js";
const mermaidModulePath = "dist/showdoc-mermaid.js";

function publicDeclaration(declaration) {
  const result = structuredClone(declaration);

  if (result.members) {
    result.members = result.members.filter(
      (member) => member.privacy !== "private" && member.privacy !== "protected",
    );
  }

  return result;
}

function bundledModule(path, declarations) {
  return {
    kind: "javascript-module",
    path,
    declarations,
    exports: declarations.flatMap((declaration) => [
      {
        kind: "js",
        name: declaration.name,
        declaration: { name: declaration.name, module: path },
      },
      {
        kind: "custom-element-definition",
        name: declaration.tagName,
        declaration: { name: declaration.name, module: path },
      },
    ]),
  };
}

const packageManifestPlugin = {
  name: "package-manifest",
  packageLinkPhase({ customElementsManifest }) {
    const declarations = customElementsManifest.modules
      .flatMap((module) => module.declarations ?? [])
      .filter((declaration) => declaration.customElement)
      .map(publicDeclaration);
    const coreDeclarations = declarations.filter(
      (declaration) => declaration.tagName !== "shw-mermaid",
    );
    const mermaidDeclarations = declarations.filter(
      (declaration) => declaration.tagName === "shw-mermaid",
    );

    customElementsManifest.modules = [
      bundledModule(coreModulePath, coreDeclarations),
      bundledModule(mermaidModulePath, mermaidDeclarations),
    ];
  },
};

export default {
  globs: ["src/components/*.ts"],
  litelement: true,
  plugins: [packageManifestPlugin],
};
