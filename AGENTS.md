# Offorte ShowDoc agent guide

Offorte ShowDoc is an agent skill backed by a small public web-component library. It helps agents
turn compact Markdown and semantic `shw-*` elements into readable HTML documents.

## Project map

- `src/components/` owns the public `shw-*` elements.
- `src/internal/` owns private parsing and registration helpers.
- `src/styles/` owns generated global CSS and Shadow DOM typography CSS.
- `skills/show-doc/SKILL.md` owns the agent-facing authoring API.
- `demo/index.html` is the human-facing design example.
- `examples/` owns isolated artifacts that load the current versioned CDN bundle.
- `test/` verifies browser behavior against the built bundle.
- `scripts/` verifies package and manifest contracts.

## Work rules

- Keep the public API small. Reuse an existing component before adding one.
- Keep Lit Shadow DOM enabled. Expose theme changes through `--shw-*` variables.
- Keep raw HTML and dangerous URL protocols disabled in Micromark.
- Do not add a framework or runtime network request.
- Do not add lazy loading. Each release runtime is one self-contained JS file with optional CSS.
- Keep Mermaid in `showdoc-mermaid.js`. Do not add Mermaid to the core `showdoc.js` bundle.
- Use exact dependency versions.
- Format only with Oxfmt. Lint with Oxlint.

## Public API changes

When an element, attribute, theme variable, or source grammar changes, update these together:

1. Component implementation.
2. Browser test.
3. `README.md`.
4. `skills/show-doc/SKILL.md`.
5. `custom-elements.json` through `pnpm manifest`.

## Verification

Run the narrowest relevant command while working. Run the full gate before handoff:

```sh
pnpm agent:verify
```

Do not weaken a check to make it pass. Fix the source or the documented contract.
