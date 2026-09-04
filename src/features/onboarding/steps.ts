import type { OnboardingTourStep } from '@gfazioli/mantine-onboarding-tour'
import type { TourName } from './seen'

/**
 * What the tour points at, and what it says.
 *
 * Chosen for what a new user would otherwise miss rather than for what is
 * obvious. "This is the list of your resumes" earns nobody anything; that the
 * backup in Settings is the only copy of a local-first document is the sentence
 * this app most needs someone to read before they need it.
 *
 * A step's `id` is matched against an `OnboardingTour.Target` of the same id
 * mounted somewhere below the provider — so every id here has exactly one
 * anchor in the tree, and a step whose anchor is not mounted would darken the
 * screen and point at nothing. That is why there are two tours rather than one
 * crossing between the library and the editor: each tour's anchors are all on
 * the route it runs on.
 */

export const TOUR_TARGET_IDS = {
  newResume: 'tour-new-resume',
  assets: 'tour-assets',
  settings: 'tour-settings',
  appMenu: 'tour-app-menu',
  code: 'tour-code',
  guide: 'tour-guide',
  paper: 'tour-paper',
  paperTitlebar: 'tour-paper-titlebar',
  inspector: 'tour-inspector',
  history: 'tour-history',
} as const

/**
 * The steps whose anchor is a row in the sidebar.
 *
 * Where the sidebar is permanent this means nothing. Where it is an overlay —
 * a phone, a narrow tablet — those rows are translated off screen, so the tour
 * would dim the app and point at nothing, with no way forward. `AppTour` opens
 * the drawer for exactly these.
 */
export const SIDEBAR_STEP_IDS: ReadonlySet<string> = new Set([
  TOUR_TARGET_IDS.assets,
  TOUR_TARGET_IDS.settings,
])

const LIBRARY_STEPS: Array<OnboardingTourStep> = [
  {
    id: TOUR_TARGET_IDS.newResume,
    title: 'Start here',
    content:
      'Pick one of four single-column templates, or import a Markdown file you already have — the importer keeps what it cannot typeset rather than dropping it.',
  },
  {
    id: TOUR_TARGET_IDS.assets,
    title: 'Images and fonts are shared',
    content:
      'Uploaded once and available to every resume on this device, so the same photograph never has to be added twice. Both pages also show what nothing refers to any more, which is the only safe way to reclaim the space.',
  },
  {
    id: TOUR_TARGET_IDS.settings,
    title: 'This is the important one',
    content:
      'Everything lives in this browser and nowhere else. Clearing its storage deletes your resumes, and no server has a copy. The backup file in Settings is the only thing that survives that — writing one now is cheaper than wishing you had.',
  },
  {
    id: TOUR_TARGET_IDS.appMenu,
    title: 'Everything, from the keyboard',
    content:
      'Ctrl+K — or Cmd+K — opens a command palette over the whole app: every page, every command, searchable. The menu here lists the other shortcuts, and is where this tour can be started again.',
  },
]

const EDITOR_STEPS: Array<OnboardingTourStep> = [
  {
    id: TOUR_TARGET_IDS.code,
    title: 'Markdown, and your own CSS',
    content:
      'Two tabs. The Markdown is the document — headings, lists, tables, task lists — and the CSS is yours to restyle the paper with. It is sanitized and scoped, so it cannot reach the app around it or break the pagination it was measured against.',
  },
  {
    id: TOUR_TARGET_IDS.guide,
    title: 'Every directive, with an example',
    content:
      'The format is Markdown plus a few directives — an entry, a contact, a list of skills — and this is where each one is written down, with an example that is checked against the real parser. It also copies a prompt that states the whole format to an assistant, including what never to write, so a resume you asked one for comes back in a shape this app can read.',
  },
  {
    id: TOUR_TARGET_IDS.paper,
    title: 'The paper is editable too',
    content:
      'Switch to Visual and click any text to change it in place, or drag a block to move it. Every edit goes to the same document as the Markdown, which is why one undo history covers all of it.',
  },
  {
    id: TOUR_TARGET_IDS.paperTitlebar,
    title: 'Export is the same document',
    content:
      'HTML is one self-contained file — images and fonts inlined, no external reference of any kind — and PDF is that same file printed, so the two cannot disagree. Markdown uses the same writer the editor reads.',
  },
  {
    id: TOUR_TARGET_IDS.inspector,
    title: 'Three tabs worth knowing',
    content:
      'Style is every design token: paper size, margins, type, colour, rules, and where pages break. Sections is the outline — reorder, hide, add an icon, start a section on a new page. Assets places an image or sets the resume in an uploaded face.',
  },
  {
    id: TOUR_TARGET_IDS.history,
    title: 'Nothing here is one-way',
    content:
      'Undo and redo cover the document, whichever surface the change came from — a slider, a drag, a keystroke on the paper. Autosave writes to this device as you go.',
  },
]

export const tourSteps = (name: TourName): Array<OnboardingTourStep> =>
  name === 'library' ? LIBRARY_STEPS : EDITOR_STEPS
