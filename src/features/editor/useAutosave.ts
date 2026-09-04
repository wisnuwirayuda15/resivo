import { useEffect, useRef } from "react";

import { resumeRepo } from "@/database/index";
import { patchSavedResume } from "@/features/resume/queries";
import { useQueryClient } from "@tanstack/react-query";

import { createAutosave } from "./autosave";
import { useEditorStore } from "./store";

import type { Autosave } from "./autosave";

/**
 * Wires the editor store to IndexedDB.
 *
 * Client-only: it writes to the database, so it must be mounted inside the
 * editor's client-only boundary.
 *
 * Subscribes to the store rather than reading it during render, so a keystroke
 * schedules a write without re-rendering this component on every change.
 */
export const useAutosave = (
  resumeId: string | undefined,
): { flush: () => Promise<void> } => {
  const client = useQueryClient();
  const autosaveRef = useRef<Autosave | undefined>(undefined);

  useEffect(() => {
    if (resumeId === undefined) {
      return;
    }

    const autosave = createAutosave({
      /**
       * The cache is updated from the row the repository wrote, inside `save`,
       * rather than from the document that was handed in. `saveResumeDocument`
       * decides `updatedAt` and rewrites part of the document, so the caller's
       * copy is not what is on disk, and it is the copy on disk that the editor
       * reads when someone walks back in.
       */
      save: async (document) => {
        patchSavedResume(
          client,
          await resumeRepo.saveResumeDocument(resumeId, document),
        );
      },
      onSaved: (document) => useEditorStore.getState().markSaved(document),
      onStatusChange: (status) =>
        useEditorStore.getState().setSaveStatus(status),
    });

    autosaveRef.current = autosave;

    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      if (
        state.document !== null &&
        state.document !== previous.document &&
        state.resumeId === resumeId
      ) {
        autosave.schedule(state.document);
      }
    });

    /**
     * `visibilitychange` rather than `beforeunload`: mobile browsers and
     * background-tab discards often skip `beforeunload` entirely, and hiding the
     * tab is the last reliable moment to persist. `pagehide` covers the
     * navigation case that visibility does not.
     */
    const flushNow = () => {
      void autosave.flush();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushNow();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flushNow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flushNow);
      unsubscribe();
      // Flush rather than cancel: unmount usually means navigating away, and
      // discarding the last few hundred milliseconds of typing is data loss.
      void autosave.flush();
      autosaveRef.current = undefined;
    };
  }, [resumeId, client]);

  return {
    flush: async () => {
      await autosaveRef.current?.flush();
    },
  };
};
