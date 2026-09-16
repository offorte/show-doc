---
name: show-doc
description: Create compact, readable standalone HTML documents with Offorte ShowDoc components and Markdown when a human-facing artifact needs more visual structure than normal prose.
metadata:
  version: "0.0.4" # x-release-please-version
---

# ShowDoc

Use ShowDoc when the user asks for a ShowDoc or HTML document. Otherwise, use it for reports, plans,
reviews, decisions, and explanations that need a durable file or more visual structure than normal
chat Markdown. Do not use it for dashboards, forms, or application-like tools.

## Output contract

Create one HTML file. Use `@latest` in the CDN URL by default. This loads the latest published
release, so an existing document can receive runtime updates. If the user needs a fixed result,
use an exact published version instead. The skill's `metadata.version` identifies the skill
release; it does not select the default runtime version.

Documents use light mode by default, regardless of the system theme. Use the complete starting
point below when the document does not need Mermaid:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script
      type="module"
      src="https://cdn.jsdelivr.net/npm/@offorte/show-doc@latest/dist/showdoc.js"
    ></script>
    <title>Retry plan</title>
  </head>
  <body>
    <shw-doc>
      <shw-header heading="A safer retry" eyebrow="Implementation plan">
        Preserve the draft when a temporary connection error interrupts a save.
      </shw-header>

      <shw-summary heading="Proposal">Keep the draft and let the user retry.</shw-summary>

      <shw-section heading="Next steps">
        <shw-steps>
          1. Keep the current draft after a failed save. 2. Check that a successful retry saves it
          once.
        </shw-steps>
      </shw-section>
    </shw-doc>
  </body>
</html>
```

If the document uses Mermaid, replace the script in the starting point with the larger bundle:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@offorte/show-doc@latest/dist/showdoc-mermaid.js"
></script>
```

Use only one script. The Mermaid bundle contains all core components.

Use normal document metadata. Wrap the visible document in one `shw-doc`. Do not add inline
JavaScript, a stylesheet link, copied component DOM, custom presentation CSS, or long runs of
presentation HTML.

After writing the file, open or preview it with the host's supported local-file tool when one is
available. Return the exact file path.

## Component chooser

| Element           | Compact API                                                             | Use                                              |
| ----------------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| `shw-doc`         | -                                                                       | The one page canvas.                             |
| `shw-header`      | `heading`, `eyebrow?`                                                   | The one title and short Markdown lead.           |
| `shw-summary`     | `heading?`                                                              | The answer before the evidence.                  |
| `shw-section`     | `heading?`, `intro?`, `level?`                                          | A topic with an automatic divider.               |
| `shw-markdown`    | -                                                                       | Normal prose, lists, links, tasks, and headings. |
| `shw-mermaid`     | `label?`                                                                | A diagram from Mermaid source.                   |
| `shw-grid`        | `columns?`                                                              | Two to four sibling blocks to compare.           |
| `shw-card`        | `heading?`, `label?`, `tone?`                                           | One grouped idea, choice, or status.             |
| `shw-badge`       | `tone?`                                                                 | A short standalone state or category.            |
| `shw-callout`     | `heading?`, `tone?`                                                     | One message that needs attention.                |
| `shw-stat`        | `label`, `value`, `change?`, `tone?`                                    | One prominent metric or result.                  |
| `shw-steps`       | -                                                                       | A process from numbered Markdown lines.          |
| `shw-code`        | `filename?`, `language?`, `line-numbers?`, `highlight?`, `annotations?` | Code, supplied diffs, and notes tied to lines.   |
| `shw-table`       | `caption?`                                                              | Row and column data from pipe text.              |
| `shw-figure`      | `caption?`                                                              | An image, inline SVG, or diagram.                |
| `shw-collapsible` | `summary?`, `open?`, `content?`                                         | Optional Markdown or child document blocks.      |

Defaults reduce source. A summary heading is `Summary`. A section level is `2`. Grid columns are
`2`. A collapsible summary is `Details`, and its content mode is `markdown`. Default tone is
`neutral`, except callouts use `info`.

Tones are `info`, `success`, `warning`, `danger`, and `neutral`. Use them only when the meaning helps
the reader.

## Choose the smallest useful shape

- Pick the smallest structure that makes the main point clear.
- Start with `shw-header`. Add `shw-summary` when readers need the answer first.
- Use Markdown for the story. Add a component only when it gives meaning or layout.
- Use `shw-steps` for a simple sequence. Write each step as `1. ...`, `2. ...`, and so on.
- Use `shw-code` without `language` for pseudocode and structural trees. Use `html`, `js`, `ts`, or
  `json` for syntax highlighting. Use `diff` for a supplied unified patch.
- Use `shw-mermaid` when relationships, branches, data flow, or participant interactions matter.
- Put two or three comparable cards or stats in `shw-grid`.
- Use a table only for aligned data. Table body cells support Markdown.
- Use `shw-figure` when one visual needs a caption. Give visuals useful alternative text or labels.
- Put long logs, assumptions, and rejected options in a collapsible.

Use more than one visual form only when each one answers a different question. Do not turn every
paragraph into a card. Do not use a callout as decoration.

## Give the document a visual rhythm

For a substantial document, choose a useful central visual: a comparison, a flow, a change excerpt,
or a small set of real metrics. Build the explanation around it. Alternate readable prose with
focused visuals and compact evidence instead of repeating the same grid of cards in every section.

- Use the header eyebrow for context and a short title for the main idea.
- Keep prose narrow. Give code, wide tables, and diagrams a full section when they need space.
- Use grids for comparable short items. Stack wide screenshots and long code excerpts.
- Label comparisons explicitly: current/proposed, before/after, or option names. Use the same
  capture size and scale for screenshots. Keep unchanged context visible.
- Put the purpose of a code excerpt or diagram immediately above it. Use a figure caption for
  the visual's scope, source, or limitation.
- Use the default theme and semantic tones. The components provide accent details and subtle
  surface contrast. Do not invent metrics, statuses, icons, or decorative panels to fill space.

## Plan and recap recipes

These are starting points. Omit sections that do not help with the actual task.

**Implementation plan:** Start with the proposed outcome and the reason. Show current/proposed
behavior with two cards in a grid, or use a Mermaid diagram for relationships. Use sections inside
a grid when each side needs several child components. Record the chosen direction separately from
open questions. Use steps for the work sequence; name the expected result and check for each step.
Put supporting source and rejected alternatives in disclosures.

**Change recap:** Start with what changed and who it affects. Show a small real diff or matched
before/after figures when comparison helps. Explain the important lines with a few annotations.
Use a table for checks, observed results, and remaining gaps. Keep blockers visible. Put long logs
and secondary evidence in disclosures.

Use source facts for filenames, code, fields, and results. Label proposals, inferred UI sketches,
and illustrative examples. Distinguish **implemented** from **verified**. Name which checks ran;
never turn a suggested check or an unchecked box into a passed result.

## Rich expandable detail

Use `content="blocks"` to place other ShowDoc components inside a disclosure. Wrap prose in
`shw-markdown` in this mode. Keep Markdown text as the default for a simple note.

<!-- prettier-ignore -->
```html
<shw-collapsible summary="Inspect the evidence" content="blocks">
  <shw-code filename="save.ts" language="ts">await save(draft);</shw-code>
  <shw-table caption="Verification record">
    Check | Result
    Retry after a failed save | Not run
  </shw-table>
</shw-collapsible>
```

## Code changes and annotations

ShowDoc displays supplied source. It does not fetch files, compute a diff, or verify a claim.
Use `language="diff"` for unified diff text. Preserve its headers and `+`, `-`, and space prefixes.
Do not use a diff when a short after-only example explains the change better.

Use `line-numbers` when referring to code lines. `highlight="2,4-6"` emphasizes selected lines.
`annotations` is a JSON array with `start`, optional `end`, and Markdown `text`. Notes stay visible
below the code. Use a few notes to explain intent, consequences, or a subtle constraint.

All line references are **1-based positions in the displayed excerpt**, including diff headers.
They are not repository line numbers. Count after removing the outer blank lines and common
indentation. Invalid JSON or out-of-range references produce a visible authoring message; correct
that message before sharing the document.

<!-- prettier-ignore -->
```html
<shw-code
  filename="save.ts"
  language="ts"
  line-numbers
  highlight="2"
  annotations='[{"start":2,"text":"Keep the draft available until the save succeeds."}]'
>
  async function saveDraft(draft) {
    await save(draft);
    clearDraft();
  }
</shw-code>
```

In single-quoted JSON attributes, encode an apostrophe as `&#39;`. Encode `&` as `&amp;` and literal
`<` as `&lt;`. Use JSON escapes for double quotes inside note text.

## Source rules

Keep the HTML shallow. Markdown-rendering components read their text content. Do not nest a
component inside their Markdown. Layout components and a collapsible with `content="blocks"`
accept child components.

Blank lines create paragraphs. Task lists use `- [ ]` and `- [x]`. Strikethrough uses `~~text~~`.
Start optional Markdown headings at `##`. `shw-header` already creates the single `h1`.

For `shw-table`, write one pipe-separated row per line. The first row contains headers. Escape a
content pipe as `\|`.

Raw HTML inside Markdown is disabled. Write `&lt;` for a literal `<`, including code inside
`shw-code`. Use normal `https` links. Do not use `javascript:` or data URLs.

Write Mermaid diagram text directly inside `shw-mermaid`. Set `label` to its short accessible name.
The Mermaid bundle supports the full Mermaid package and makes no extra runtime request.

Do not run a generic HTML formatter over the result. It can remove meaningful Markdown line breaks.
