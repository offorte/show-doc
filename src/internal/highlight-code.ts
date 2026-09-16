import Prism from "prismjs";

const languageAliases: Record<string, string> = {
  html: "markup",
  js: "javascript",
  json: "javascript",
  ts: "javascript",
};

function escapeHtml(source: string): string {
  return source
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function codeGrammar(requestedLanguage: string) {
  const language = languageAliases[requestedLanguage] ?? requestedLanguage;
  const grammar = Prism.languages[language];

  return {
    language,
    grammar: typeof grammar === "object" && grammar !== null ? grammar : undefined,
  };
}

export function highlightCode(source: string, requestedLanguage: string): string {
  const { language, grammar } = codeGrammar(requestedLanguage);
  return grammar === undefined ? escapeHtml(source) : Prism.highlight(source, grammar, language);
}

function appendTextLines(lines: string[], text: string, ancestors: string[]): void {
  for (const [index, part] of text.split("\n").entries()) {
    if (index > 0) {
      lines.push("");
    }

    lines[lines.length - 1] +=
      ancestors.join("") + escapeHtml(part) + "</span>".repeat(ancestors.length);
  }
}

/** Tokenize the whole source before dividing it into independently balanced line fragments. */
export function highlightCodeLines(source: string, requestedLanguage: string): string[] {
  if (source === "") {
    return [];
  }

  const { grammar } = codeGrammar(requestedLanguage);
  const tokens = grammar === undefined ? [source] : Prism.tokenize(source, grammar);
  const lines = [""];

  function append(token: string | Prism.Token, ancestors: string[]): void {
    if (typeof token === "string") {
      appendTextLines(lines, token, ancestors);
      return;
    }

    const classes = ["token", token.type, token.alias ?? []].flat().join(" ");
    const wrappers = [...ancestors, `<span class="${escapeHtml(classes)}">`];
    for (const child of [token.content].flat()) {
      append(child, wrappers);
    }
  }

  for (const token of tokens) {
    append(token, []);
  }

  return lines;
}
