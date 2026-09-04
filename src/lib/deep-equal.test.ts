import { describe, expect, it } from "vitest";

import { deepEqual } from "./deep-equal";

describe("deepEqual", () => {
  it("compares primitives by value", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("a", "a")).toBe(true);
    expect(deepEqual(1, "1")).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
  });

  it("ignores key order", () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("treats an explicitly undefined field as absent", () => {
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });

  it("compares nested objects and arrays structurally", () => {
    expect(
      deepEqual(
        { margin: { top: 0.6, left: 0.6 }, tags: ["a", "b"] },
        { tags: ["a", "b"], margin: { left: 0.6, top: 0.6 } },
      ),
    ).toBe(true);

    expect(deepEqual({ tags: ["a", "b"] }, { tags: ["b", "a"] })).toBe(false);
  });

  it("does not treat an array as equal to an object with the same keys", () => {
    expect(deepEqual(["x"], { 0: "x" })).toBe(false);
  });

  it("reports a difference in a deeply nested value", () => {
    expect(
      deepEqual(
        { typography: { weights: { body: 400 } } },
        { typography: { weights: { body: 500 } } },
      ),
    ).toBe(false);
  });
});
