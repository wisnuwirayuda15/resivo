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

**Library.** Multiple resumes, organised into groups, with search, sort,
duplicate and archive. Archived resumes are hidden, never deleted.

**Three-panel editor.** Markdown and CSS on the left, the paper in the middle,
style controls on the right. Panel widths are draggable and remembered. Below
1200px — where three panes and the sidebar no longer fit — the same three become
one behind a tab strip rather than overflowing sideways.

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
rules, icons, and where pages break.

**Page breaks.** Three scales, because the need comes in three. `::pagebreak`
puts a break between two particular things and round-trips through Markdown; a
per-section toggle starts a section on a fresh sheet; and one document-wide
setting decides whether a heading may be the last thing on a page. What the
paginator does _not_ do is split an item: an entry never breaks mid-entry, and
by the same token a paragraph is never balanced across a break.

**Custom CSS.** Your own stylesheet, applied to the resume only. It is
sanitized — no `@import`, no external `url()`, no `position: fixed` — and injected
into a cascade layer above the template, so it can restyle the paper but cannot
reach the app around it or break the pagination it was measured against.

**Assets.** An image gallery and custom font upload, shared across every resume
on the device, each with a page of its own that also reports what nothing refers
to any more. Fonts are validated by the browser's own font parser on upload, so
a bad file is refused rather than silently falling back. Settings totals up what
the device is holding.

**Icons.** All 1512 Phosphor icons in all six weights, searchable, rendered as
inline SVG so they survive into an export.

**Export.** PDF is the browser printing the preview — the same document, so the
PDF _is_ what you were looking at. HTML is one file with no external reference of
any kind: images, custom fonts and the bundled typefaces are all inlined.
Markdown uses the same serializer the editor reads.

**Keyboard and discovery.** `Ctrl/Cmd+K` opens a command palette over every page
and command; the application menu lists the shortcuts and the things worth
knowing. A first visit offers a short tour — of the library, and of the editor
the first time a resume is opened — which can be skipped from any step and
restarted from that menu or the palette.

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

That is also why CSS fragmentation properties — `orphans`, `widows`,
`break-inside` — are deliberately absent from the print stylesheet. Each page box
is assigned exactly one sheet, so there is no CSS fragmentation left for them to
influence, and `break-inside: avoid` on an item that printed a fraction taller
than it measured would let the browser move it to a sheet of its own and add a
page the preview never showed. The equivalent guarantees are structural instead:
items are atomic, and a heading is kept with what follows it.

The document is one typed model, and every edit — a keystroke in the Markdown
pane, a slider in the style panel, a drag on the paper — goes through the same
typed recipes. That is what keeps one undo history coherent across three very
different editing surfaces.

## Decisions worth knowing

**There is no version history, and that is a decision.** Undo covers the whole
session and every surface, and the JSON backup covers the cases that outlive
one — a machine lost, a browser cleared, a document taken somewhere else. A
revision store would spend the device's storage on a recovery path those two
already provide, on an app whose whole premise is that the storage is finite and
local. If a resume needs to be kept as it was, save a backup or export the
Markdown; both are one click.

**Two things in `PRD.md` were superseded while building, and the file is left as
it was written.** It lists Iconify web components in the stack and Phosphor with
a searchable picker in its own section; Phosphor is what was built, because the
picker has to render thousands of glyphs under virtualization and an export has
to inline real SVG — neither of which a webfont serves. And it asks for three
initial templates, where four exist: `classic`, `modern`, `technical` and
`editorial`. Neither difference is a gap to close; both are recorded here so the
PRD can be read as the brief it was rather than as a checklist that half
failed.

## Stack

TanStack Start (SSR shell) · TanStack Router, Query · Mantine 9, with Spotlight
for the palette and `mantine-onboarding-tour` for the first run · Tailwind CSS 4
· Zustand + Immer · Dexie / IndexedDB · Zod · Monaco · unified / remark ·
PostCSS · dnd-kit · Phosphor

The SSR shell is kept, but nothing that touches user data runs on the server:
IndexedDB, Monaco, the preview iframe and dnd-kit all sit behind client-only
boundaries.

## Project layout

```
e2e/               Playwright specs, and the moves they share
src/
  routes/          file-based routes (library, editor, assets, settings, about)
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
    settings/      app preferences and storage usage
    commands/      the command palette
    onboarding/    the first-run tours
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
bun run test:e2e       # playwright, in a real browser
bun run lint           # eslint
bun run check          # prettier --check
bun run format         # prettier --write, then eslint --fix
bun run generate-icons # rebuild the icon catalog from @phosphor-icons/core
```

`generate-icons` writes `src/features/icons/*.gen.ts`, which is **committed**.
Codegen deliberately stays out of the build so a clean checkout does not depend
on a dev dependency resolving to the same icon-set version.

## Testing

Two suites, for two different questions.

```bash
bun run test
```

Unit-level, no browser: the model, the Markdown codec, the paginator, the CSS
sanitizer, the reorder logic, the export writer, the backup format and the
document migrations. Repository tests use `fake-indexeddb`; the few that need a
DOM opt in per file with `// @vitest-environment happy-dom`.

```bash
bun run test:e2e
```

Playwright, in a real Chromium. This is the only place the parts that exist only
in a browser get exercised: a Mantine modal, a Monaco editor that has actually
laid itself out, the preview iframe, an edit made by clicking on the paper, a
page count that changes when a break is inserted, and IndexedDB surviving a
reload. `e2e/workflow.spec.ts` is the whole thing end to end — create, edit,
restyle, add an image, export, group, back up, reload, wipe, restore — and it is
the test that says the app works, rather than that its parts do.

`openEmptyApp` starts every spec from a deleted database, and marks the
onboarding tours as already seen: a new database is a new user, and the tour's
overlay would otherwise intercept the clicks the rest of the suite makes.
`e2e/onboarding.spec.ts` is the one that opts back in.

`bun run test:e2e:ui` opens Playwright's runner if you want to watch it happen.
The dev server is started automatically, and reused if one is already running.

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
