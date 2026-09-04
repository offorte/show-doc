import globalStyles from "./showdoc.css?inline";

const styleMarker = "data-shw-styles";

export function installGlobalStyles(): void {
  if (typeof document === "undefined" || document.head.querySelector(`[${styleMarker}]`) !== null) {
    return;
  }

  const style = document.createElement("style");
  style.setAttribute(styleMarker, "");
  style.textContent = globalStyles;
  document.head.append(style);
}
