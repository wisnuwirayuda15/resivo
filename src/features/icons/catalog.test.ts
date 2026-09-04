import { describe, expect, it } from "vitest";

import {
  isIconWeight,
  parseCatalog,
  parseGlyphs,
  scoreIcon,
  searchIcons,
} from "./catalog";

import type { IconWeight } from "@/features/resume/model/document";

/**
 * The generated files are not imported by most of these: the tests are about the
 * reader and the ranking, and pulling in megabytes of glyphs to assert that
 * "star" beats "star-four" would make the suite slower for no extra confidence.
 * The last block does load them, to check every weight is present, complete and
 * distinct.
 */

const entry = (name: string, terms = "") => ({ name, terms });

const ENTRIES = [
  entry("star", "rate ratings favorites"),
  entry("star-four", "sparkle"),
  entry("star-half", ""),
  entry("trash", "delete remove bin"),
  entry("envelope-simple", "mail email"),
  entry("envelope", "mail email"),
  entry("map-pin", "location place"),
];

describe("parseCatalog", () => {
  it("reads name and terms from each line", () => {
    const { entries, byName } = parseCatalog(
      "star\trate favorites\ntrash\tdelete",
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({ name: "star", terms: "rate favorites" });
    expect(byName.get("trash")?.terms).toBe("delete");
  });

  it("ignores blank lines", () => {
    expect(parseCatalog("a\t\n\n").entries).toHaveLength(1);
  });

  it("yields nothing for an empty source", () => {
    expect(parseCatalog("").entries).toEqual([]);
  });
});

describe("parseGlyphs", () => {
  it("maps each name to its markup", () => {
    const glyphs = parseGlyphs('star\t<path d="a"/>\ntrash\t<path d="b"/>');

    expect(glyphs.get("star")).toBe('<path d="a"/>');
    expect(glyphs.size).toBe(2);
  });

  it("yields nothing for an empty source", () => {
    expect(parseGlyphs("").size).toBe(0);
  });
});

describe("isIconWeight", () => {
  it("accepts the six weights and nothing else", () => {
    expect(isIconWeight("duotone")).toBe(true);
    expect(isIconWeight("regular")).toBe(true);
    expect(isIconWeight("Bold")).toBe(false);
    expect(isIconWeight("")).toBe(false);
  });
});

describe("scoreIcon", () => {
  it("ranks an exact name above everything", () => {
    expect(scoreIcon(entry("star"), "star")).toBeGreaterThan(
      scoreIcon(entry("star-four"), "star"),
    );
  });

  it("ranks a prefix above a word boundary above a bare substring", () => {
    const prefix = scoreIcon(entry("star-four"), "star");
    const boundary = scoreIcon(entry("shooting-star"), "star");
    const inside = scoreIcon(entry("restart"), "star");

    expect(prefix).toBeGreaterThan(boundary);
    expect(boundary).toBeGreaterThan(inside);
  });

  it("ranks a name match above a tag match", () => {
    expect(scoreIcon(entry("trash-simple"), "trash")).toBeGreaterThan(
      scoreIcon(entry("x-circle", "trash delete"), "trash"),
    );
  });

  it("finds an icon by a word that is not in its name", () => {
    expect(
      scoreIcon(entry("trash", "delete remove"), "delete"),
    ).toBeGreaterThan(0);
  });

  it("prefers a whole tag to a tag it merely appears inside", () => {
    expect(scoreIcon(entry("a", "delete"), "delete")).toBeGreaterThan(
      scoreIcon(entry("b", "undeleted"), "delete"),
    );
  });

  it("falls back to a scattered subsequence", () => {
    expect(scoreIcon(entry("envelope-simple"), "envlp")).toBeGreaterThan(0);
  });

  it("returns zero when nothing matches", () => {
    expect(scoreIcon(entry("star", "rate"), "zzzz")).toBe(0);
  });

  it("matches everything on an empty query", () => {
    expect(scoreIcon(entry("anything"), "   ")).toBe(1);
  });

  it("ignores case and surrounding space", () => {
    expect(scoreIcon(entry("star"), "  STAR ")).toBe(
      scoreIcon(entry("star"), "star"),
    );
  });
});

describe("searchIcons", () => {
  it("returns everything, in the given order, for an empty query", () => {
    expect(searchIcons(ENTRIES, "").map((e) => e.name)).toEqual(
      ENTRIES.map((e) => e.name),
    );
  });

  it("puts the obvious answer first", () => {
    expect(searchIcons(ENTRIES, "star").map((e) => e.name)).toEqual([
      "star",
      "star-four",
      "star-half",
    ]);
  });

  it("finds by tag", () => {
    expect(searchIcons(ENTRIES, "delete").map((e) => e.name)).toEqual([
      "trash",
    ]);
  });

  it("prefers the shorter of two names that both start with the query", () => {
    expect(searchIcons(ENTRIES, "envelope").map((e) => e.name)).toEqual([
      "envelope",
      "envelope-simple",
    ]);
  });

  it("orders the same query the same way whatever order it is given", () => {
    const once = searchIcons(ENTRIES, "mail").map((e) => e.name);
    const twice = searchIcons([...ENTRIES].reverse(), "mail").map(
      (e) => e.name,
    );

    expect(once).toEqual(twice);
  });

  /**
   * Both of these came from running the picker against the real catalog, where
   * the first ordering put `voicemail` above `envelope` for "mail" and buried
   * `trash` under `backspace` for "delete".
   */
  it("prefers an icon tagged with the word to one that merely contains it", () => {
    const entries = [entry("voicemail"), entry("envelope", "mail email")];

    expect(searchIcons(entries, "mail")[0]?.name).toBe("envelope");
  });

  it("puts the shortest name first among equal matches", () => {
    const entries = [
      entry("backspace", "delete"),
      entry("calendar-minus", "delete"),
      entry("trash", "delete"),
    ];

    expect(searchIcons(entries, "delete").map((e) => e.name)).toEqual([
      "trash",
      "backspace",
      "calendar-minus",
    ]);
  });

  it("returns nothing rather than everything when nothing matches", () => {
    expect(searchIcons(ENTRIES, "qqqq")).toEqual([]);
  });
});

/**
 * The one place the generated files are actually loaded. Each weight is checked
 * for the same 1512 names and for markup on every one of them, because a missing
 * or empty record would show up in the app as a silently reserved blank box
 * rather than as an error.
 */
describe("the generated files", () => {
  it("index parses, and holds the icons the app already referenced by hand", async () => {
    const { ICON_INDEX_SOURCE } = await import("./catalog.gen");
    const { entries, byName } = parseCatalog(ICON_INDEX_SOURCE);

    expect(entries.length).toBeGreaterThan(1400);

    for (const name of ["star", "trash", "envelope-simple", "map-pin"]) {
      expect(byName.get(name)?.terms).toBeTypeOf("string");
    }
  });

  it("index names every icon exactly once", async () => {
    const { ICON_INDEX_SOURCE } = await import("./catalog.gen");
    const { entries, byName } = parseCatalog(ICON_INDEX_SOURCE);

    expect(byName.size).toBe(entries.length);
    expect(entries.filter((icon) => icon.name === "")).toEqual([]);
  });

  const WEIGHT_SOURCES: Array<
    [IconWeight, () => Promise<{ GLYPH_SOURCE: string }>]
  > = [
    ["thin", () => import("./glyphs.thin.gen")],
    ["light", () => import("./glyphs.light.gen")],
    ["regular", () => import("./glyphs.regular.gen")],
    ["bold", () => import("./glyphs.bold.gen")],
    ["fill", () => import("./glyphs.fill.gen")],
    ["duotone", () => import("./glyphs.duotone.gen")],
  ];

  it.each(WEIGHT_SOURCES)(
    "has a glyph for every icon in the %s weight",
    async (_weight, load) => {
      const { ICON_INDEX_SOURCE } = await import("./catalog.gen");
      const { entries } = parseCatalog(ICON_INDEX_SOURCE);
      const glyphs = parseGlyphs((await load()).GLYPH_SOURCE);

      expect(glyphs.size).toBe(entries.length);

      const missing = entries.filter(
        (icon) => !(glyphs.get(icon.name) ?? "").startsWith("<"),
      );

      expect(missing).toEqual([]);
    },
  );

  it("draws the same icon differently in every weight", async () => {
    const drawings = new Set<string>();

    for (const [, load] of WEIGHT_SOURCES) {
      const glyph = parseGlyphs((await load()).GLYPH_SOURCE).get("star");

      expect(glyph).toBeDefined();
      drawings.add(glyph as string);
    }

    // Six distinct drawings: if a generator bug pointed two weights at the same
    // asset directory, the files would still parse and every other test here
    // would still pass.
    expect(drawings.size).toBe(WEIGHT_SOURCES.length);
  });

  it("keeps duotone its backing shape", async () => {
    const { GLYPH_SOURCE } = await import("./glyphs.duotone.gen");

    // Duotone is two shapes, the lower one drawn at reduced opacity. That
    // attribute is what makes it duotone rather than fill, and it survives only
    // because the generator lifts shapes verbatim.
    expect(parseGlyphs(GLYPH_SOURCE).get("star")).toContain("opacity");
  });
});
