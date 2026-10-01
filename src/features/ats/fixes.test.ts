import { beforeEach, describe, expect, it } from "vitest";

import { createSection } from "@/features/resume/model/index";
import { createSampleDocument } from "@/features/resume/sample";
import { createEditorStore } from "@/features/editor/store";
import { setSectionColumns } from "@/features/editor/mutations";

import { checkDocument } from "./check";
import { combineFixes, fixableIssues } from "./fixes";

import type { StoreApi, UseBoundStore } from "zustand";
import type { EditorState } from "@/features/editor/store";
import type { ResumeDocument } from "@/features/resume/model/document";

let store: UseBoundStore<StoreApi<EditorState>>;

const doc = (): ResumeDocument => {
  const { document } = store.getState();

  if (document === null) {
    throw new Error("no document open");
  }

  return document;
};

const open = (document: ResumeDocument): void => {
  store.getState().load("resume-1", document);
};

beforeEach(() => {
  store = createEditorStore();
});

/**
 * One way to break the sample for each rule that has a fix. Each starts from a
 * document that is clean, so the only thing a test sees is the one thing it
 * broke.
 */
const BREAKS: Array<[string, string, (document: ResumeDocument) => void]> = [
  [
    "ats.section-empty",
    "hides the empty section",
    (document) => {
      document.content.sections.push(createSection("interests", "Interests"));
    },
  ],
  [
    "ats.columns-two",
    "sets the section back to one column",
    (document) => {
      const first = document.content.sections[0];

      if (first !== undefined) {
        first.style = { columns: 2 };
      }
    },
  ],
  [
    "ats.font-size-small",
    "raises the body size",
    (document) => {
      document.design.typography.baseSize = 7;
    },
  ],
  [
    "ats.margins-narrow",
    "raises the narrow margins",
    (document) => {
      document.design.paper.margin = {
        top: 1,
        right: 0.2,
        bottom: 1,
        left: 0.8,
      };
    },
  ],
  [
    "ats.contrast-low",
    "restores the template colour",
    (document) => {
      document.design.colors.muted = "#cccccc";
    },
  ],
  [
    "ats.font-custom",
    "returns to the template font",
    (document) => {
      document.design.typography.bodyFont = {
        family: "Mine",
        source: "custom",
        fontId: "f1",
      };
    },
  ],
];

describe("a fix", () => {
  it.each(BREAKS)("for %s %s, in one undo step", (rule, _what, damage) => {
    const document = createSampleDocument("classic");

    damage(document);
    open(document);

    const before = checkDocument(doc());
    const issue = before.find((candidate) => candidate.rule === rule);

    expect(issue?.fix).toBeDefined();

    store.getState().apply(issue?.fix?.recipe ?? (() => undefined));

    const after = checkDocument(doc());

    // Gone, and nothing new in its place.
    expect(after.map((item) => item.id)).not.toContain(issue?.id);
    expect(after.map((item) => item.id)).toEqual(
      before.map((item) => item.id).filter((id) => id !== issue?.id),
    );

    store.getState().undo();

    expect(doc()).toEqual(document);
    expect(store.getState().canUndo()).toBe(false);
  });

  it("raises only the margins that were too narrow", () => {
    const document = createSampleDocument("classic");

    document.design.paper.margin = { top: 1, right: 0.2, bottom: 1, left: 0.8 };
    open(document);

    const issue = checkDocument(doc()).find(
      (candidate) => candidate.rule === "ats.margins-narrow",
    );

    store.getState().apply(issue?.fix?.recipe ?? (() => undefined));

    expect(doc().design.paper.margin).toEqual({
      top: 1,
      right: 0.5,
      bottom: 1,
      left: 0.8,
    });
  });

  it("restores the colour to the template's own, not to a number of its own", () => {
    const document = createSampleDocument("editorial");

    document.design.colors.accent = "#dddddd";
    open(document);

    const issue = checkDocument(doc()).find(
      (candidate) => candidate.rule === "ats.contrast-low",
    );

    store.getState().apply(issue?.fix?.recipe ?? (() => undefined));

    expect(doc().design.colors.accent).toBe("#94271d");
  });

  it("leaves a section's other overrides alone when it drops the columns", () => {
    const document = createSampleDocument("classic");
    const first = document.content.sections[0];

    if (first !== undefined) {
      first.style = { columns: 2, breakBefore: "page" };
    }

    open(document);
    store.getState().apply(setSectionColumns(first?.id ?? "", 1));

    expect(doc().content.sections[0]?.style).toEqual({ breakBefore: "page" });
  });

  it("removes the override object when columns was the only thing in it", () => {
    const document = createSampleDocument("classic");
    const first = document.content.sections[0];

    if (first !== undefined) {
      first.style = { columns: 2 };
    }

    open(document);
    store.getState().apply(setSectionColumns(first?.id ?? "", 1));

    expect(doc().content.sections[0]?.style).toBeUndefined();
  });
});

describe("fix all", () => {
  it("does every fix in one step and undoes them in one", () => {
    const document = createSampleDocument("classic");

    for (const [, , damage] of BREAKS) {
      damage(document);
    }

    open(document);

    const issues = checkDocument(doc());
    const fixable = fixableIssues(issues);

    expect(fixable.length).toBeGreaterThanOrEqual(BREAKS.length);

    const recipe = combineFixes(issues);

    expect(recipe).not.toBeNull();

    store.getState().apply(recipe ?? (() => undefined));

    expect(fixableIssues(checkDocument(doc()))).toEqual([]);

    store.getState().undo();

    expect(doc()).toEqual(document);
    expect(store.getState().canUndo()).toBe(false);
  });

  it("is nothing when there is nothing to fix", () => {
    expect(combineFixes([])).toBeNull();
    expect(
      fixableIssues(checkDocument(createSampleDocument("classic"))),
    ).toEqual([]);
  });

  it("leaves out an issue that has no fix", () => {
    const document = createSampleDocument("classic");

    document.content.header.name = [];

    const issues = checkDocument(document);

    expect(issues.some((issue) => issue.rule === "ats.name-missing")).toBe(
      true,
    );
    expect(fixableIssues(issues)).toEqual([]);
  });
});
