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

export function highlightCode(source: string, requestedLanguage: string): string {
  const language = languageAliases[requestedLanguage] ?? requestedLanguage;
  const grammar = Prism.languages[language];

  return grammar === undefined ? escapeHtml(source) : Prism.highlight(source, grammar, language);
}
