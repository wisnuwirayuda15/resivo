# Resivo

A local-first resume builder. Everything lives in your browser — no account, no
server, no network request that carries your data anywhere.

Write a resume in Markdown or edit it directly on the page, style it with a
visual panel or your own CSS, and export it as a PDF, a single self-contained
HTML file, or Markdown.

## Why local-first

A resume is a document about you: where you live, who employs you, what you are
paid. Resivo keeps all of it in IndexedDB on the device you typed it on. There is
no backend to breach and no account to delete.

The consequence is the tradeoff: clearing your browser storage deletes your
resumes, and there is no copy anywhere else. Backup and restore in Settings is
the only thing that survives a cleared browser or a lost machine.

## Getting started

```bash
bun install
```

```bash
bun run dev
```

The app runs at http://localhost:3000.

## What it does

**Library.** Multiple resumes, organised into groups, with search, duplicate and
archive. Archived resumes are hidden, never deleted.

**Three-panel editor.** Markdown and CSS on the left, the paper in the middle,
style controls on the right. Panel widths are draggable and remembered.

**Markdown.** CommonMark and GFM, plus directives such as
`:::entry{title="…" start="2021-03"}` for the structured entries a heading
convention could never recover reliably. Headings, lists of either kind at any
depth, task lists, tables, quotes and fences are all typeset. Sections are
opened by the shallowest heading level in the file, so a resume written
elsewhere with `###` headings works as pasted. It round-trips losslessly:
what is left — raw HTML, footnotes, link definitions — is kept verbatim and
flagged as a warning rather than silently dropped, and text that arrives above
the first heading goes into an untitled section rather than being refused.

**Visual editing.** Click any text on the paper to edit it in place; drag blocks
and sections to reorder them, or use the move buttons beside them. Switching the
editor on cannot move a page break — the chrome is never part of what the
paginator measures.

**Templates and style.** Four ATS-friendly templates (`classic`, `modern`,
`technical`, `editorial`), all pure CSS over one shared markup, plus a control
for every design token: paper size, margins, fonts, sizes, colours, rhythm,
rules, icons.

**Custom CSS.** Your own stylesheet, applied to the resume only. It is
sanitized — no `@import`, no external `url()`, no `position: fixed` — and injected
into a cascade layer above the template, so it can restyle the paper but cannot
reach the app around it or break the pagination it was measured against.

**Assets.** An image gallery and custom font upload, shared across every resume
on the device. Fonts are validated by the browser's own font parser on upload,
so a bad file is refused rather than silently falling back.

**Icons.** All 1512 Phosphor icons in all six weights, searchable, rendered as
inline SVG so they survive into an export.

**Export.** PDF is the browser printing the preview — the same document, so the
PDF _is_ what you were looking at. HTML is one file with no external reference of
any kind: images, custom fonts and the bundled typefaces are all inlined.
Markdown uses the same serializer the editor reads.

## How it works

The preview is a same-origin **iframe**, and that choice drives much of the
architecture. Only a separate document gives its own `@page` rule, its own root
font size, and a cascade the app cannot leak into — so the paper stays light
while the app is dark, and the document whose HTML is exported is the one on
screen.

Pagination is **measured, not guessed**: every block is laid out once in a hidden
container at the exact page width, measured, and then distributed into page boxes
using the breaks that produced. Both passes render the same React elements, so
what was measured is what appears. Export reuses those breaks rather than
re-deriving them.

The document is one typed model, and every edit — a keystroke in the Markdown
pane, a slider in the style panel, a drag on the paper — goes through the same
typed recipes. That is what keeps one undo history coherent across three very
different editing surfaces.

## Stack

TanStack Start (SSR shell) · TanStack Router, Query · Mantine 9 · Tailwind CSS 4
· Zustand + Immer · Dexie / IndexedDB · Zod · Monaco · unified / remark ·
dnd-kit · Phosphor

The SSR shell is kept, but nothing that touches user data runs on the server:
IndexedDB, Monaco, the preview iframe and dnd-kit all sit behind client-only
boundaries.

## Project layout

```
src/
  routes/          file-based routes (library, editor, assets, settings)
  features/
    resume/        the document model, schema and queries
    editor/        store, autosave, undo, Markdown and CSS panes
    preview/       iframe host, paginator, flow, reorder
    templates/     template registry and the renderers
    markdown/      the Markdown codec, both directions
    css/           the custom-CSS sanitizer
    style/         the style inspector
    icons/         generated icon catalog and picker
    assets/        images and fonts
    export/        PDF, HTML and Markdown adapters
    backup/        whole-database backup and restore
  database/        Dexie schema, repositories, migrations
  components/      app chrome
  lib/             small shared utilities
```

## Scripts

```bash
bun run dev            # dev server on :3000
bun run build          # production build
bun run typecheck      # tsc --noEmit
bun run test           # vitest
bun run lint           # eslint
bun run format         # prettier --write, then eslint --fix
bun run generate-icons # rebuild the icon catalog from @phosphor-icons/core
```

`generate-icons` writes `src/features/icons/*.gen.ts`, which is **committed**.
Codegen deliberately stays out of the build so a clean checkout does not depend
on a dev dependency resolving to the same icon-set version.

## Testing

```bash
bun run test
```

The suite is unit-level and runs without a browser: the model, the Markdown
codec, the paginator, the CSS sanitizer, the reorder logic, the export writer and
the backup format. Repository tests use `fake-indexeddb`; the few that need a DOM
opt in per file with `// @vitest-environment happy-dom`.

## Deploying

The build output is a self-contained Node server (Nitro).

```bash
bun run build
```

```bash
node .output/server/index.mjs
```

Any static or Node-compatible host works — there is no database to provision and
no environment variable to set, because the server only ever ships the app
itself. For host-specific presets see https://v3.nitro.build/deploy.
