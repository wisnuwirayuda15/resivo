import { useHotkeys } from "@mantine/hooks";

import { useEditorStore } from "./store";

/**
 * `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z` for the document's history.
 *
 * Two editors have their own undo stack and must keep the shortcut for
 * themselves, and both are excluded without this hook knowing about either:
 *
 *  - **Monaco.** Its editable surface is a `textarea`, and `useHotkeys` ignores
 *    events from `INPUT`, `TEXTAREA` and `SELECT` by default. So typing in the
 *    Markdown or CSS pane still undoes text, one keystroke at a time.
 *  - **The paper.** It is a same-origin iframe, and a keydown inside a document
 *    does not cross into its parent. While the caret is in an editable run, the
 *    browser undoes that run's own typing.
 *
 * Everywhere else the shortcut means the document: a style token, a reorder, a
 * deleted section. `Ctrl+Y` is bound too, because that is what redo is on
 * Windows outside the browser.
 */
export const useDocumentHistoryShortcuts = (): void => {
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  useHotkeys([
    ["mod+Z", undo],
    ["mod+shift+Z", redo],
    ["mod+Y", redo],
  ]);
};
