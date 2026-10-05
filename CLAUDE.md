# Resivo, for Claude

A local-first resume builder. Everything a user writes lives in IndexedDB in
their own browser: no account, no server, no request that carries their data
anywhere. That premise is the source of most decisions here, and it is worth
checking any change against it.

Read `README.md` for what the app does and `PRD.md` for the original brief
(kept as written, with two superseded items reconciled in the README).

## Commands

```bash
bun install
bun run dev              # :3000
bun run typecheck        # tsc --noEmit
bun run test             # vitest, 1017 tests in 71 files
bun run test:e2e         # playwright, 166 specs, chromium only
bun run test:e2e:pwa     # playwright against a real build, 11 specs
bun run lint             # eslint
bun run check            # prettier --check
bun run format           # prettier --write, then eslint --fix
```

Run `typecheck`, `lint`, `check` and `test` after any change, and `test:e2e`
for anything that touches the browser. `.claude/launch.json` starts the dev
server for the preview pane; never start one with Bash.

Codegen, committed on purpose so a clean checkout does not depend on a dev
dependency resolving:

```bash
bun run generate-routes    # src/routeTree.gen.ts
bun run generate-icons     # src/features/icons/*.gen.ts
bun run generate-favicon   # the five PNG marks in public/
bun run generate-og        # public/og.png
```

Never hand-edit `src/routeTree.gen.ts`, `src/features/icons/*.gen.ts` or
`src/styles/theme.css`. The last is written by `tailwind-preset-mantine`.

## House style

**No em dash, anywhere.** Not in code, comments, copy, docs or commit
messages. A dash between clauses is a comma, a dash introducing a definition is
a colon, a pair around an aside is brackets, and a dash joining two independent
clauses is a full stop. En dashes are banned too, with one exception:
`RANGE_DASH` in `features/templates/renderer/dates.ts` is the separator printed
between two dates on a resume, which is what an en dash is for.
`src/lib/dashes.test.ts` enforces both rules over the whole working tree.

**Mantine components, not raw elements.** `Text` and `Box` instead of `p`,
`span` and `div`. The exception is inside the preview iframe, which loads
neither Mantine nor Tailwind, and semantic elements (`section`, `header`,
`noscript`) where they carry meaning.

**Tailwind classes or Mantine style props, never the native `style` prop.**
Combine classes with `cn()` from `src/lib/utils.ts`, which resolves Tailwind
conflicts so a `className` prop can override a component's own default.

**Comments say why, not what.** The convention is a doc comment that names the
decision, the number it came from, and the alternative that was rejected. If a
constant is a measurement, the comment carries the measurement.

**Commits: one per phase of work, and no attribution trailers.** No
`Co-Authored-By`, no "Generated with".

## Things that are expensive to rediscover

**Breakpoints are Mantine's, not Tailwind's defaults.**
`tailwind-preset-mantine` overwrites them, so in this repo `sm` is 768px, `md`
is 992px, `lg` is 1200px and `xl` is 1408px. There is also an `xs` at 576px.
A layout written against Tailwind's 640px `sm` will open up 128px too late.

**Cascade layer order is declared at the top of `src/styles/global.css`:**
`theme, base, mantine, mantine-onboarding-tour, components, utilities`.
Unlayered CSS beats every layered rule whatever the order, so always import the
`styles.layer.css` build of a Mantine ecosystem package, and put app rules that
must be overridable by a utility in `@layer components`. Two bugs in this repo
came from forgetting that: an unlayered `a { color }` in `base.css` that beat
`.text-muted`, and the tour's own stylesheet.

**The preview is a same-origin iframe, and that drives the architecture.** Only
a separate document gives its own `@page` rule, its own root font size and a
cascade the app cannot leak into, which is what lets the paper stay light while
the app is dark and makes the exported HTML the document on screen. React
renders into it by portal, so there is one component tree. Inside it the paper
CSS is layered `template` (paper.css plus the template's own CSS), then
`tokens` (the document's `DesignConfig`), then `custom` (the user's CSS, which
wins).

**Pagination is measured, not guessed.** Every block is laid out once in a
hidden container at the exact page width, measured, then distributed into page
boxes. Export reuses those breaks rather than re-deriving them, which is what
makes "the PDF matches the preview" true by construction. Never put anything in
the pagination key that the layout can feed back into: an earlier bug measured
the frame width, which changed the zoom, which changed the scrollbar, which
changed the width, at 507 paginations for 123 layout changes.

**Two state systems, on purpose.** Zustand (`features/editor/store.ts`) owns
the live document, because it changes on every keystroke and every drag frame.
TanStack Query owns the persisted side with `staleTime: Infinity`. Autosave is
the bridge. A save must patch both the detail key and the list row through
`patchSavedResume`, or the next visit reads a stale document and autosaves it
over the real one.

**Anything touching IndexedDB, Monaco, the iframe or dnd-kit sits inside
`ClientOnly`.** The SSR shell is kept and nothing that touches user data runs
on the server.

**`parseDocument(source, previous)` falls back to position, not just title.**
Given a previous document, each heading takes the identity of a section that was
already there, and when no title matches it takes the first one left. That is
deliberate: it is what lets a section be renamed in the Markdown without losing
its id, its icon, its hidden flag or its per-section style. It is also wrong for
building a document out of nothing. A template's empty starting point carries
four sections (Summary, Experience, Education, Skills), so a file whose second
section is Projects took Experience's kind, and a template lays a section out by
kind. Nothing corrected it afterwards, because kind is never written back to
Markdown.

So there are two calls, and the difference between them is building against
editing. `applyMarkdown(document, source)` is for a document the user has been
editing. `documentFromMarkdown(base, source)` parses the source alone and keeps
only `base`'s design tokens, and is what both the example resume and the
Markdown importer use. Anything else that turns a file into a new document wants
the second one.

**Mantine control heights are fixed pixels, not font-derived.** `xs` is 30px
and `sm` is 36px. The theme defaults every control to `xs`, which is the design
system's own default height.

**The editor is three panes above 1200px and one pane behind a `Tabs` below
it,** with `keepMounted={false}` because an inactive Mantine panel is
`display: none` and a preview left mounted in one would measure its paper at
zero width. The onboarding tour drives that tab strip through
`features/editor/tourPane.ts`, and below the breakpoint its three pane steps
point at the tab that opens each pane rather than at the pane.

**Words go through `t()`, and the language is applied after hydration.**
Messages are `src/locales/{en,id}/<namespace>.ts`; the English `as const` is the
type source and the Indonesian file is `satisfies Widen<typeof en...>`, so a
missing key fails `typecheck`. Import `useTranslation` from
`@/lib/i18n/useTranslation`, never from `react-i18next` (lint forbids it): the
wrapper is pinned to a `useSyncExternalStore` whose server snapshot is `"en"`,
which is what keeps the first client render identical to the server's. The
stored language (`localStorage` `resivo.language`) is applied in an effect, so
there is no detector plugin. `t()` is only ever called during render, never at
module load, which is why switching language needs no reload. Data that holds
words (the catalog, the tour, the ATS findings) holds keys and params, and the
words are looked up when shown; `checkDocument` stays pure and language-free.
`i18next/no-literal-string` rejects text between JSX tags, and
`src/lib/i18n/i18n.test.ts` fails on a missing key, a changed placeholder or an
Indonesian sentence still in English. The AI prompts (`content/prompts`) and the SEO
tags stay English on purpose. The one place words skip `t()` is the docs' MDX
prose, which is a document in two languages rather than an interface; the docs
chrome around it goes through `useDocsTranslation` like everything else.

**A bundle's "looks the same" rests on the template's `version`.** A bundle
(`features/bundle/`) records the revision of the template that drew it, and an
import tells the person when it differs, because `ResumeTemplate.version` in
`templates/registry.ts` is the only thing that says a template's CSS moved.
Bump it when you change a template's CSS or markup in a way that reflows an
existing resume. Reading a bundle is split from writing it on purpose:
`readResumeBundle` does everything that can refuse (zip, sizes, manifest,
`migrateDocument`, image and font checks) and writes nothing, and
`restoreResumeBundle` only writes, in one transaction, because Dexie cannot
hold a transaction across an await on anything that is not Dexie. Keep decoding
and hashing in the first.

**A cover letter is `ResumeDocument.kind`, and four places read it.** There is
no second table, route or editor. `kind ?? "resume"` is how to read it, and it
is written only for a letter, so every older row is valid as it stands. The four
places: `preview/flow.ts` leaves out the section heading item (otherwise the
untitled section leaves an empty box above the first paragraph);
`templates/defaults.ts` takes the kind (`templateDefaults(id, kind)`,
`designMatchesTemplate(design, id, kind)`), and a new call site that seeds or
compares a design has to pass it or a letter will look customised the moment it
is made; `ats/check.ts` chooses `LETTER_RULES`; and the library files by
`ResumeSummary.kind`. A letter's one section has an empty title on purpose,
which the Markdown writes as a bare `##` and reads back as the same section.
`kind` survives `applyMarkdown` and `documentFromMarkdown` because both
spread the document or base they are given; it is not in the Markdown itself.

**The docs are content, and the content is tested like code.** The text is MDX in
`content/docs/{en,id}/` (Fumadocs headless: `fumadocs-core` and `fumadocs-mdx`,
no `fumadocs-ui`, all chrome is Mantine), served at `/<lang>/docs/...`, with
`/docs/...` redirecting to the saved or negotiated language. Rules that are
checked by `features/docs/content.test.ts`: the same files and `meta.json` in
every language; ASCII slugs identical across languages; no h1 in a page; a
description of at most 160 characters; internal links and anchors that resolve;
the same headings with the same ids, components and code-fence kinds in both
languages. Every `resume` fence must parse with no warning (or say `warns` and
really warn), and every `css` fence must say `verify` (kept whole by
`sanitizeCss`) or `refused` (not). **Bold in prose means a label the app shows,
written exactly as the app writes it** (checked against the message files and
the export adapters); emphasis is otherwise plain or italic, and a code name is
in backticks. `design.test.ts` and `usage.test.ts` tie quoted numbers, names and
lists to the code that owns them (every CSS variable `designVars` writes, every
`rp-` class the markup draws, the ATS rules, the export formats, the limits), so a
change there fails the page by name. The AI prompts are text files in
`content/prompts`, included into the page, so the page, its Markdown and the copy
button read the same bytes. A page is written in English first with the
Indonesian in the same commit, and a translation may not change the text inside
a directive attribute, because parity compares it.

The docs are also meant for tools. Every page has a `.md` address, the normal
address gives Markdown to a client that sends `Accept: text/markdown`,
`/llms.txt`, `/<lang>/llms.txt` and `/<lang>/llms-full.txt` list and carry every
page, and `/api/mcp` is a stateless, read-only MCP server over the same pages. All
of it is public text and none of it touches the app's data.

**SEO: three app routes and the docs are indexable** (`/`, `/templates`,
`/about`, `/<lang>/docs/...`) and every route behind the app shell sends
`noindex`, because they render one browser's IndexedDB and a crawler would only
ever see an empty shell. Build the tags with `seo()` from `src/lib/seo.ts`; a
docs page goes through `docsHead` (`features/docs/head.ts`), which adds the
canonical, the hreflang cluster and a breadcrumb trail through `seoLinks()`.
Those need an absolute origin, which comes from `resolveSiteOrigin` in
`src/lib/siteOrigin.ts`: `SITE_URL` first, the request's origin second, and no
absolute tag at all when neither exists. Never take a canonical from a
`Host` header alone. `robots.txt` and `sitemap.xml` are routes, not files in
`public/`: a static `robots.txt` would shadow the route. `theme-color` has to
live in the document head in `__root.tsx`, not in a route's `head`: the router
dedupes meta by name and would keep only one of the light and dark pair.

**The service worker is production-only, and that is why it has its own test
config.** `public/sw.js` is registered from an inline script in `__root.tsx`
only when `import.meta.env.PROD`, because a worker caching Vite's unhashed dev
modules reads as the app ignoring a saved edit. It also means `bun run test:e2e`
(a dev server, on purpose) cannot exercise it at all, hence
`playwright.pwa.config.ts` and `e2e-pwa/`, which build and serve for real on
:3100. Four rules inside it: navigations are network-first so a deploy lands on
the first visit, `/assets/*` is cache-first because every name there carries a
content hash, and the manifest, the icons, `/api/search/*` and `/_serverFn/*` (the
docs' search index and page data) are stale-while-revalidate because their URLs
are stable. A docs page that was never opened falls back, offline, to a redirect
to its language's docs home when that was opened, and not to the app shell: the
document is hydrated against its own address, so serving another page's HTML
under it lands on the error screen. The docs answer with `Vary: Accept`, which
the Cache API honours, so a lookup built from a bare path needs `ignoreVary`.
The `.md`, `llms*.txt` and `/api/mcp` addresses are deliberately not handled.
It deliberately does not `skipWaiting` or claim clients,
so an update never purges the cache under a page that is still running. Bump
`VERSION` in it when its logic changes.

**The promo film is code that reuses the app, and its sound is written from the
same clock as its picture.** `video/` is a separate package (`bun install` in
it, then `bun run video:studio` or `bun run video:render` from the root) that
resolves `@/` to `../src`, so the paper in it is drawn by the real template
renderer, the ATS panel's words and findings come from the real rules, and the
colours are the app's own `tokens.css` and `scheme.css`. It is kept out of the
root `tsc` and ESLint (webpack, not Vite, so `?raw` is mapped in
`remotion.config.ts`); type it with `bun run --cwd video typecheck`. Dark is one
subtree under `data-mantine-color-scheme="dark"`, which works because
`scheme.css` keys off that attribute on any element. The paper is a shadow root
and not an iframe, since a frame has to be ready on the frame it is asked for.
Everything is placed on a 120 BPM grid in `video/src/timeline.json`: a beat is 30
frames at 60 fps, a scene starts on a bar line, and
`video/scripts/generate-audio.mjs` reads the same file to synthesise the music
and one effect for each event (nothing is recorded or downloaded, so there is no
licence to check). Move an event in the JSON and its sound moves with it. Run
`bun run --cwd video audio:check` after changing the mix; it needs ffmpeg
(`FFMPEG`, or the PATH). Remotion bundles its own, so rendering does not.

## Layout

```
content/           the docs (MDX, en and id) and the AI prompts
e2e/               Playwright specs, and the moves they share in app.ts
e2e-pwa/           the offline spec, which needs a real build (own config)
e2e-media/         the docs clips: scripted Playwright recordings (own config)
video/             the 28 second promo film: Remotion, its own package
src/
  routes/          file-based routes
  features/
    resume/        the document model, schema, queries and the example
    editor/        store, autosave, undo, Markdown and CSS panes
    preview/       iframe host, paginator, flow, reorder
    templates/     template registry and the renderers
    markdown/      the Markdown codec, both directions
    css/           the custom-CSS sanitizer
    style/         the style inspector
    icons/         generated icon catalog and picker
    assets/        images and fonts
    ats/           the ATS check: pure rules over the document, and the tab
    export/        PDF, HTML, Markdown, JSON Resume and plain text adapters
    interchange/   reading a file into a document, and JSON Resume and text out
    bundle/        one resume as a zip with its images and fonts, both ways
    versions/      a version per job: the comparison, its drawer, the dialog
                   (cover letters have no folder: they are `kind` on a document)
    docs/          the public documentation: routes, search, Markdown for readers
                   and agents (the text itself is in content/docs)
    landing/       the marketing page at /
    pwa/           installing, and whether the app is cached here
    backup/        whole-database backup and restore
    settings/      app preferences and storage usage
    commands/      the command palette
    onboarding/    the first-run tours
  database/        Dexie schema, repositories, migrations
  components/      app chrome
  lib/             small shared utilities
  styles/          tokens, scheme, theme, layer order
```

## Testing

Two suites for two questions. `bun run test` is unit-level and has no browser:
the model, the codec, the paginator, the sanitizer, the export writer, the
backup format, the migrations. Repository tests use `fake-indexeddb`; the few
that need a DOM opt in per file with `// @vitest-environment happy-dom`.

`bun run test:e2e` is the only place the browser-only parts are exercised. Two
things to know before writing one:

- `openEmptyApp` in `e2e/app.ts` deletes the database, marks both onboarding
  tours as seen, and starts at `/resumes`. It does not start at `/`, which is
  the landing page now. `e2e/onboarding.spec.ts` is the spec that opts back in.
- On the landing page, wait for hydration before clicking. A click on a
  server-rendered button that React has not taken over does nothing, and
  TanStack restores the scroll position on hydration, so the test reads a page
  that has silently gone back to the top. `e2e/landing.spec.ts` has a `hydrated`
  helper.

Known flake: `e2e/assets.spec.ts`, "an image uploaded in the editor shows up on
the Images page", fails intermittently in full-suite runs and passes on its own
and on a rerun. Not diagnosed. Do not treat a single occurrence as a regression
without reproducing it.
