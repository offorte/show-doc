export function usesDarkTheme(): boolean {
  const root = document.documentElement;
  const explicitTheme = [root.dataset.shwTheme, root.dataset.theme].find(Boolean);
  return explicitTheme === "dark";
}

export function toggleTheme(): void {
  document.documentElement.dataset.shwTheme = usesDarkTheme() ? "light" : "dark";
}
