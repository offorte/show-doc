---
name: show-doc
description: Create compact, readable standalone HTML documents with versioned Offorte ShowDoc components and Markdown when a human-facing artifact needs more visual structure than normal prose.
metadata:
  version: "0.0.3" # x-release-please-version
---

# ShowDoc

Use ShowDoc when the user asks for a ShowDoc or HTML document. Otherwise, use it for reports, plans,
reviews, decisions, and explanations that need a durable file or more visual structure than normal
chat Markdown. Do not use it for dashboards, forms, or application-like tools.

## Output contract

Create one HTML file. Use this skill's exact `metadata.version` in the CDN URL. Use the complete
starting point below when the document does not need Mermaid:

<!-- x-release-please-start-version -->

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script
      type="module"
      src="https://cdn.jsdelivr.net/npm/@offorte/show-doc@0.0.3/dist/showdoc.js"
    ></script>
    <title>Release decision</title>
  </head>
  <body>
    <shw-doc>
      <shw-header heading="Release decision" eyebrow="Review">
        The current build passed all required checks.
      </shw-header>

      <shw-summary>The release is **approved**. Complete these two steps.</shw-summary>

      <shw-section heading="Next steps">
        <shw-steps> 1. Publish the package. 2. Confirm the production version. </shw-steps>
      </shw-section>
    </shw-doc>
  </body>
</html>
```

If the document uses Mermaid, replace the script in the starting point with the larger bundle:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@offorte/show-doc@0.0.3/dist/showdoc-mermaid.js"
></script>
```

<!-- x-release-please-end -->

Use only one script. The Mermaid bundle contains all core components.

Use normal document metadata. Wrap the visible document in one `shw-doc`. Do not add inline
JavaScript, a stylesheet link, copied component DOM, custom presentation CSS, or long runs of
presentation HTML.

After writing the file, open or preview it with the host's supported local-file tool when one is
available. Return the exact file path.

## Component chooser

| Element           | Compact API                          | Use                                              |
| ----------------- | ------------------------------------ | ------------------------------------------------ |
| `shw-doc`         | -                                    | The one page canvas.                             |
| `shw-header`      | `heading`, `eyebrow?`                | The one title and short Markdown lead.           |
| `shw-summary`     | `heading?`                           | The answer before the evidence.                  |
| `shw-section`     | `heading?`, `intro?`, `level?`       | A topic with an automatic divider.               |
| `shw-markdown`    | -                                    | Normal prose, lists, links, tasks, and headings. |
| `shw-mermaid`     | `label?`                             | A diagram from Mermaid source.                   |
| `shw-grid`        | `columns?`                           | Two to four sibling blocks to compare.           |
| `shw-card`        | `heading?`, `label?`, `tone?`        | One grouped idea, choice, or status.             |
| `shw-badge`       | `tone?`                              | A short standalone state or category.            |
| `shw-callout`     | `heading?`, `tone?`                  | One message that needs attention.                |
| `shw-stat`        | `label`, `value`, `change?`, `tone?` | One prominent metric or result.                  |
| `shw-steps`       | -                                    | A process from numbered Markdown lines.          |
| `shw-code`        | `filename?`, `language?`             | Highlighted HTML, JS, TS, or JSON.               |
| `shw-table`       | `caption?`                           | Row and column data from pipe text.              |
| `shw-figure`      | `caption?`                           | An image, inline SVG, or diagram.                |
| `shw-collapsible` | `summary?`, `open?`                  | Evidence or detail most readers can skip.        |

Defaults reduce source. A summary heading is `Summary`. A section level is `2`. Grid columns are
`2`. A collapsible summary is `Details`. Default tone is `neutral`, except callouts use `info`.

Tones are `info`, `success`, `warning`, `danger`, and `neutral`. Use them only when the meaning helps
the reader.

## Choose the smallest useful shape

- Pick the smallest structure that makes the main point clear.
- Start with `shw-header`. Add `shw-summary` when readers need the answer first.
- Use Markdown for the story. Add a component only when it gives meaning or layout.
- Use `shw-steps` for a simple sequence. Write each step as `1. ...`, `2. ...`, and so on.
- Use `shw-code` without `language` for pseudocode, call trees, component trees, file trees, and
  structural diffs. Set `language` only for highlighted HTML, JS, TS, or JSON source.
- Use `shw-mermaid` when relationships, branches, data flow, or participant interactions matter.
- Put two or three comparable cards or stats in `shw-grid`.
- Use a table only for aligned data. Table body cells support Markdown.
- Use `shw-figure` when one visual needs a caption. Give visuals useful alternative text or labels.
- Put long logs, assumptions, and rejected options in a collapsible.

Use more than one visual form only when each one answers a different question. Do not turn every
paragraph into a card. Do not use a callout as decoration.

## Source rules

Keep the HTML shallow. Markdown-rendering components read their text content. Do not nest a
component inside their Markdown.

Blank lines create paragraphs. Task lists use `- [ ]` and `- [x]`. Strikethrough uses `~~text~~`.
Start optional Markdown headings at `##`. `shw-header` already creates the single `h1`.

For `shw-table`, write one pipe-separated row per line. The first row contains headers. Escape a
content pipe as `\|`.

Raw HTML inside Markdown is disabled. Write `&lt;` for a literal `<`, including code inside
`shw-code`. Use normal `https` links. Do not use `javascript:` or data URLs.

Write Mermaid diagram text directly inside `shw-mermaid`. Set `label` to its short accessible name.
The Mermaid bundle supports the full Mermaid package and makes no extra runtime request.

Do not run a generic HTML formatter over the result. It can remove meaningful Markdown line breaks.
