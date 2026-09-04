export function defineElement(name: string, element: CustomElementConstructor): void {
  if (typeof customElements !== "undefined" && customElements.get(name) === undefined) {
    customElements.define(name, element);
  }
}
