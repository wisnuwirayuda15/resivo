import { describe, expect, it } from "vitest";

import { commonSubsequence, diffWords } from "./diff";

const side = (parts: ReturnType<typeof diffWords>, keep: "removed" | "added") =>
  parts
    .filter((part) => part.type === "same" || part.type === keep)
    .map((part) => part.text)
    .join("");

describe("commonSubsequence", () => {
  it("finds the longest run that kept its order", () => {
    const letters = ["a", "b", "c", "d"];
    const pairs = commonSubsequence(letters, ["c", "a", "b", "d"]);

    expect(pairs.map(([row]) => letters[row])).toEqual(["a", "b", "d"]);
  });

  it("handles empty and disjoint input", () => {
    expect(commonSubsequence([], ["a"])).toEqual([]);
    expect(commonSubsequence(["a"], [])).toEqual([]);
    expect(commonSubsequence(["a"], ["b"])).toEqual([]);
  });

  it("takes a custom equality", () => {
    expect(
      commonSubsequence(
        [{ id: 1 }, { id: 2 }],
        [{ id: 2 }, { id: 3 }],
        (a, b) => a.id === b.id,
      ),
    ).toEqual([[1, 0]]);
  });
});

describe("diffWords", () => {
  it("says nothing changed as one unchanged part", () => {
    expect(diffWords("same words", "same words")).toEqual([
      { type: "same", text: "same words" },
    ]);
    expect(diffWords("", "")).toEqual([]);
  });

  it("marks a replaced word as removed and added around what stayed", () => {
    expect(diffWords("built the API", "built the platform")).toEqual([
      { type: "same", text: "built the " },
      { type: "removed", text: "API" },
      { type: "added", text: "platform" },
    ]);
  });

  it("marks an insertion and a deletion", () => {
    expect(diffWords("one three", "one two three")).toEqual([
      { type: "same", text: "one " },
      { type: "added", text: "two " },
      { type: "same", text: "three" },
    ]);
    expect(diffWords("one two three", "one three")).toEqual([
      { type: "same", text: "one " },
      { type: "removed", text: "two " },
      { type: "same", text: "three" },
    ]);
  });

  it("reproduces both sides exactly from the one result", () => {
    const before = "Led a team of  five engineers,\nshipping weekly.";
    const after = "Led a team of eight engineers; shipping every week.";
    const parts = diffWords(before, after);

    expect(side(parts, "removed")).toBe(before);
    expect(side(parts, "added")).toBe(after);
  });

  it("shows everything from nothing and nothing from everything", () => {
    expect(diffWords("", "new text")).toEqual([
      { type: "added", text: "new text" },
    ]);
    expect(diffWords("old text", "")).toEqual([
      { type: "removed", text: "old text" },
    ]);
  });

  it("gives up gracefully on a paragraph too long to align", () => {
    const long = Array.from({ length: 4000 }, (_, i) => `w${i}`).join(" ");
    const parts = diffWords(long, `${long} extra`);

    expect(parts).toEqual([
      { type: "removed", text: long },
      { type: "added", text: `${long} extra` },
    ]);
  });
});
