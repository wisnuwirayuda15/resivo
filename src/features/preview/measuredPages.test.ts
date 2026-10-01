import { beforeEach, describe, expect, it } from "vitest";

import { createEmptyDocument } from "@/features/resume/model/index";

import { pageCountFor, useMeasuredPages } from "./measuredPages";

const state = () => useMeasuredPages.getState();

beforeEach(() => {
  useMeasuredPages.setState({ measured: null, mounted: false });
});

describe("pageCountFor", () => {
  it("knows nothing before anything is measured", () => {
    expect(pageCountFor(state(), createEmptyDocument())).toBeNull();
  });

  it("answers for the document that was measured", () => {
    const document = createEmptyDocument();

    state().report(document, 3);

    expect(pageCountFor(state(), document)).toBe(3);
  });

  it("stops applying to a changed document once no paper is on screen", () => {
    const measured = createEmptyDocument();
    const edited = { ...measured, customCss: "a { color: red }" };

    state().report(measured, 3);
    state().unmount();

    // The count is still true of the document it names, and of no other. This is
    // the narrow layout: an edit made with the paper unmounted moved the count
    // and nothing measured it.
    expect(pageCountFor(state(), measured)).toBe(3);
    expect(pageCountFor(state(), edited)).toBeNull();
  });

  it("trusts the last count while a paper is on screen to correct it", () => {
    const measured = createEmptyDocument();
    const edited = { ...measured, customCss: "a { color: red }" };

    state().mount();
    state().report(measured, 3);

    // The frame between an edit and the paper reporting on it. Refusing here
    // would blank the count on every keystroke.
    expect(pageCountFor(state(), edited)).toBe(3);
  });

  it("starts from nothing when a paper mounts, so another resume's count is not read as this one's", () => {
    state().report(createEmptyDocument(), 7);
    state().mount();

    expect(pageCountFor(state(), createEmptyDocument())).toBeNull();
  });

  it("keeps the count when the paper unmounts", () => {
    const document = createEmptyDocument();

    state().mount();
    state().report(document, 2);
    state().unmount();

    expect(state().mounted).toBe(false);
    expect(pageCountFor(state(), document)).toBe(2);
  });
});
