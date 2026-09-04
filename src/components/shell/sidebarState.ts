/**
 * Whether the sidebar is collapsed to its rail.
 *
 * A layout preference, so `localStorage` rather than the settings table, the
 * reason `features/editor/panels.ts` gives applies here twice over: the width
 * has to be known before anything is drawn, and an async read would let the full
 * sidebar paint once and then shove the whole page 172px sideways.
 *
 * The width itself is a CSS variable rather than a React value, which is the
 * part worth explaining. `AppShell` writes `--app-shell-navbar-width` inline on
 * its root, so pointing that at `--sidebar-width` and switching the variable
 * from an attribute on `<html>` means the restore can happen in a script in the
 * document head, before the first paint, exactly the trick, and exactly the
 * reason, behind `ColorSchemeScript`. Passing the width through React instead
 * would put it in the server-rendered markup, where it cannot know what this
 * browser last chose.
 */

const STORAGE_KEY = 'resivo.sidebar.collapsed'

/** The value of `data-sidebar` the stylesheet keys the rail width off. */
const RAIL = 'rail'

/**
 * Restores the attribute before the first paint.
 *
 * A string rather than a function because it is inlined into the document head:
 * it has to run before React exists. Kept to one statement, and wrapped, since a
 * browser set to block site data throws on the property access rather than
 * returning null, and a throw here would abort the rest of the head.
 */
export const SIDEBAR_RESTORE_SCRIPT = `try{if(localStorage.getItem('${STORAGE_KEY}')==='1')document.documentElement.dataset.sidebar='${RAIL}'}catch{}`

export const readSidebarCollapsed = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // Also the server, where there is no `localStorage` at all. Expanded is the
    // right answer for both: it is what the markup already says.
    return false
  }
}

/**
 * Moves the attribute the width depends on, and remembers the choice.
 *
 * Called from an effect, so on the first pass it agrees with what the head
 * script already did and changes nothing.
 */
export const applySidebarCollapsed = (collapsed: boolean): void => {
  if (collapsed) {
    document.documentElement.dataset.sidebar = RAIL
  } else {
    delete document.documentElement.dataset.sidebar
  }

  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
  } catch {
    // A full or blocked store costs the preference on the next visit, nothing
    // more, the sidebar still collapses for this one.
  }
}
