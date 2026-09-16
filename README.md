# ShowDoc

**Write for agents. Render for people.**

ShowDoc is an agent skill for Codex, Claude Code, and other compatible coding agents. It replaces
separate Markdown and HTML versions with one shared HTML artifact for agents and people.

An agent writes compact Markdown and semantic `shw-*` elements. One JavaScript include
provides the components, Markdown rendering, presentation DOM, and CSS.

The source DOM stays small and focused on content. Agents can read and update it without sorting
through repeated presentation code. People get clear type, spacing, status, columns, code, and
optional detail. There is no second version to keep in sync.

In one practical review, a normal artifact was estimated at **300 to 800 lines**. The same document
was estimated at **40 to 80 lines of ShowDoc source**. This is an illustrative comparison, not a
fixed benchmark. The exact reduction depends on the document.

## Example

Open [How Offorte ShowDoc works](https://offorte.github.io/show-doc/) to see a complete ShowDoc
document. It explains the authoring model and shows the components in a real page.

Then use **View Page Source** in your browser. The source contains compact `shw-*` elements,
Markdown, and one versioned CDN script. It does not contain copied component markup or presentation
CSS that an agent must maintain.

## What the skill creates

The skill creates compact source that contains the meaning and layout decision:

```html
<shw-section heading="Decision" intro="The existing API supports the required flow.">
  <shw-card heading="Recommendation" label="Approved" tone="success">
    Keep the current endpoint. It has the **smallest change** and a reversible rollout.
  </shw-card>
</shw-section>
```

ShowDoc supplies the repeated presentation DOM and CSS. The agent keeps the useful content small
and easy to change.

Use ShowDoc for:

- Technical explanations and architecture reviews.
- Decision records, plans, and project updates.
- Research findings and comparison reports.
- Release notes and other documents that people scan or print.

ShowDoc is not intended for dashboards, forms, modals, or large interactive tools. Those need their
own application code.

## Plans and change recaps

Build a plan from an outcome, a focused comparison or diagram, and steps with clear checks. Build
a recap from the resulting behavior, a real change excerpt, and the checks that actually ran.
Existing grids, sections, cards, figures, and tables supply the structure.

For code, `shw-code` supports `language="diff"` for supplied unified patches, `line-numbers`,
`highlight="2,4-6"`, and notes tied to lines:

<!-- prettier-ignore -->
```html
<shw-code
  filename="save.ts"
  language="ts"
  line-numbers
  highlight="2"
  annotations='[{"start":2,"text":"Clear the draft only after the save succeeds."}]'
>
  await save(draft);
  clearDraft();
</shw-code>
```

Annotations are a JSON array of `start`, optional `end`, and Markdown `text`. Line references are
1-based positions in the displayed excerpt, including any diff headers. They are not file line
numbers. Invalid JSON or ranges show an authoring message without hiding the source. Notes remain
visible below the code. ShowDoc does not fetch source, compute changes, or verify claims.

Use `shw-collapsible content="blocks"` for expandable evidence that contains other components:

<!-- prettier-ignore -->
```html
<shw-collapsible summary="Supporting evidence" content="blocks">
  <shw-code filename="save.ts" language="ts">await save(draft);</shw-code>
  <shw-table caption="Checks">
    Check | Result
    Save retry | Not run
  </shw-table>
</shw-collapsible>
```

The default disclosure body remains Markdown. In blocks mode, wrap prose in `shw-markdown`.
The [authoring skill](./skills/show-doc/SKILL.md) includes plan and recap recipes, comparison
guidance, source escaping rules, and the full compact API.

Documents default to light mode, regardless of the system theme. The theme uses a clear title,
restrained accents, distinct metrics, and subtle surface contrast.
Use visual variety to explain the content: short comparisons in a grid, wide evidence in a full
section, and secondary detail in a disclosure. Keep uncertain results and open decisions explicit.

## Install the skill

After you download or clone this repository, copy the complete [`skills/show-doc`](./skills/show-doc/)
folder to your agent's personal skills directory.

For Codex:

```sh
mkdir -p ~/.agents/skills
cp -R skills/show-doc ~/.agents/skills/
```

For Claude Code:

```sh
mkdir -p ~/.claude/skills
cp -R skills/show-doc ~/.claude/skills/
```

Other compatible agents can use the same folder in their own skills directory.

## Use the skill

Ask your agent for the document you need:

> Use the ShowDoc skill to create a visual project update.

The [`show-doc` skill](./skills/show-doc/SKILL.md) contains the runtime setup,
component reference, and authoring rules. It creates the complete HTML file for you. You do not need
to choose a CDN script or write setup code.

The skill uses `@latest` CDN URLs by default, so generated documents can receive future published
updates. Ask for an exact version when a document needs to keep the same runtime. The released
showcase stays pinned to its matching package version.

## Safety

ShowDoc uses Micromark with safe defaults. Raw HTML and dangerous URL protocols are not enabled in
Markdown. Mermaid uses its strict security mode. Syntax highlighting escapes unknown code. ShowDoc
performs no lazy loading and makes no runtime request after its selected JavaScript bundle loads.

Do not run a generic HTML formatter over a finished artifact. Some formatters collapse blank lines
inside unknown custom elements. Those blank lines are meaningful Markdown input.

## Development

The project requires Node.js `24.19.0` or newer and pnpm `10.30.0`.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm serve
pnpm build
pnpm agent:verify
```

`pnpm serve` rebuilds the package and serves the CDN-backed showcase at
`http://127.0.0.1:4173`.

`pnpm agent:verify` checks formatting, lint, TypeScript, browser behavior, the Custom Elements
Manifest, bundle limits, package contents, and unused code.

## Releases

Release Please reads Conventional Commit types on `main`. `fix:` and `opt:` prepare a patch release.
`feat:` prepares a minor release. A type with `!`, or a `BREAKING CHANGE` footer, prepares a major
release.

Merging the Release Please pull request creates the GitHub release. The `Release package` workflow
then verifies and publishes the npm package. After publication succeeds, it calls the separate
`Deploy Pages` workflow with the release tag. `Deploy Pages` only deploys the example site. It can
also run manually.

## About Offorte

Offorte is automated proposal software that helps businesses create, send, and track beautiful,
interactive proposals. It pairs smart workflows with flexible tools, so you can work faster
without losing your personal touch. [Learn more about Offorte](https://www.offorte.com/).

## License

MIT
