import { describe, expect, it, vi } from "vitest";

import { createId } from "./id";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("createId", () => {
  it("returns a version 4 UUID", () => {
    expect(createId()).toMatch(UUID_V4);
  });

  it("does not repeat", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId()));

    expect(ids.size).toBe(1000);
  });

  it("still produces a valid UUID without crypto.randomUUID", () => {
    // Insecure origins expose getRandomValues but not randomUUID.
    vi.stubGlobal("crypto", {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    });

    try {
      expect(createId()).toMatch(UUID_V4);

      const ids = new Set(Array.from({ length: 500 }, () => createId()));
      expect(ids.size).toBe(500);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("still produces a valid UUID with no crypto at all", () => {
    vi.stubGlobal("crypto", undefined);

    try {
      expect(createId()).toMatch(UUID_V4);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
