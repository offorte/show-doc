# ShowDoc

**Write for agents. Render for people.**

ShowDoc is an agent skill for Codex, Claude Code, and other compatible coding agents. It turns
reports, plans, reviews, and explanations into polished HTML documents. You describe the document.
The skill handles the structure, components, Markdown, and browser setup.

Agents work well with Markdown. It is compact, easy to scan, and cheap to change. People often need
more visual structure. Clear type, spacing, status, columns, code, and optional detail make complex
documents easier to read.

Normal HTML artifacts solve the visual problem. They often repeat hundreds of lines of HTML, CSS,
and JavaScript. That source is expensive for an agent to inspect whenever one sentence changes.

The ShowDoc skill keeps the source small. It guides an agent to write Markdown and semantic `shw-*`
elements. ShowDoc turns that source into a polished document.

In one practical review, a normal artifact was estimated at **300 to 800 lines**. The same document
was estimated at **40 to 80 lines of ShowDoc source**. This is an illustrative comparison, not a
fixed benchmark. The exact reduction depends on the document.

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

See the complete [codebase overview artifact](./examples/codebase-overview.html). It uses ShowDoc to
explain ShowDoc. Each release also publishes this artifact as the
[live ShowDoc showcase](https://offorte.github.io/show-doc/).

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

The [`show-doc` skill](./skills/show-doc/SKILL.md) contains the full versioned runtime contract,
component reference, and authoring rules. It creates the complete HTML file for you. You do not need
to choose a CDN script or write setup code.

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

`pnpm serve` rebuilds the production bundle and serves the isolated showcase at
`http://127.0.0.1:4173`.

`pnpm agent:verify` checks formatting, lint, TypeScript, browser behavior, the Custom Elements
Manifest, bundle limits, package contents, and unused code.

## About Offorte

Offorte is automated proposal software that helps businesses create, send, and track beautiful,
interactive proposals. It pairs smart workflows with flexible tools, so you can work faster
without losing your personal touch. [Learn more about Offorte](https://www.offorte.com/).

## License

MIT
