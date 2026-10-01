import { describe, expect, it } from "vitest";

import i18n, { setLanguage } from "./index";
import {
  FALLBACK_LANGUAGE,
  LANGUAGE_NAMES,
  NAMESPACES,
  RESOURCES,
  SUPPORTED_LANGUAGES,
  detectLanguage,
  isAppLanguage,
} from "./language";

/**
 * The compiler already holds Indonesian to English's keys, through `Widen`.
 * What it cannot see is the text: a string left in English, an empty one, a
 * placeholder that was translated away. Those are what these tests are for, and
 * they are the failures the reference project has no defence against.
 */

type Tree = { [key: string]: string | ReadonlyArray<string> | Tree };

/**
 * `a.b.c` for every string in a message tree, and `a.b.0`, `a.b.1` for the
 * strings of a paragraph list. An array is held to the same keys as any other
 * node, which is what makes "the same number of paragraphs in both languages" a
 * property of the key check and not a separate one.
 */
const flatten = (
  tree: Tree | ReadonlyArray<string>,
  prefix = "",
): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix === "" ? key : `${prefix}.${key}`;

    return typeof value === "string"
      ? { ...acc, [path]: value }
      : { ...acc, ...flatten(value, path) };
  }, {});

const placeholders = (text: string): Array<string> =>
  [...text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)]
    .map((match) => match[1] ?? "")
    .sort();

/**
 * Strings that are the same in both languages on purpose: a brand, a file
 * format, a key on a keyboard. Anything with three words or more that is
 * identical in the two languages is assumed to be a translation nobody did, so
 * this list is the way to say otherwise.
 */
const SAME_ON_PURPOSE = new Set<string>([]);

const SHORT = 3;

describe.each(NAMESPACES)("namespace %s", (namespace) => {
  const english = flatten(RESOURCES.en[namespace]);
  const indonesian = flatten(RESOURCES.id[namespace]);

  it("has the same keys in every language", () => {
    expect(Object.keys(indonesian).sort()).toEqual(Object.keys(english).sort());
  });

  it("has no empty string", () => {
    for (const [key, value] of [
      ...Object.entries(english),
      ...Object.entries(indonesian),
    ]) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("keeps every placeholder, and adds none", () => {
    for (const [key, value] of Object.entries(english)) {
      expect(placeholders(indonesian[key] ?? ""), key).toEqual(
        placeholders(value),
      );
    }
  });

  it("does not leave a sentence untranslated", () => {
    const untranslated = Object.entries(english).filter(
      ([key, value]) =>
        indonesian[key] === value &&
        value.split(/\s+/).length >= SHORT &&
        // A string that is only placeholders and punctuation, such as
        // "{{width}}×{{height}} · {{size}}", has nothing to translate, so being
        // the same in both languages is correct.
        /\p{L}/u.test(value.replace(/\{\{[^}]*\}\}/g, "")) &&
        !SAME_ON_PURPOSE.has(`${namespace}.${key}`),
    );

    expect(untranslated.map(([key]) => `${namespace}.${key}`)).toEqual([]);
  });
});

describe("the namespaces", () => {
  it("are the same set in every language", () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(Object.keys(RESOURCES[language]).sort()).toEqual(
        [...NAMESPACES].sort(),
      );
    }
  });
});

describe("languages", () => {
  it("names every supported language as itself", () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(LANGUAGE_NAMES[language]).not.toBe("");
    }
  });

  it("recognises only the supported ones", () => {
    expect(isAppLanguage("en")).toBe(true);
    expect(isAppLanguage("id")).toBe(true);
    expect(isAppLanguage("fr")).toBe(false);
    expect(isAppLanguage(undefined)).toBe(false);
  });

  it("falls back to English when there is no browser to ask", () => {
    // The unit tests run in node, where there is neither a window nor a
    // navigator, and a function that throws there would take the server render
    // down with it.
    expect(detectLanguage()).toBe(FALLBACK_LANGUAGE);
  });
});

describe("the instance", () => {
  it("starts in English, which is what the server renders", () => {
    expect(i18n.language).toBe("en");
    expect(i18n.t("shell:sidebar.newResume")).toBe("New resume");
  });

  it("switches language without a reload, and switches back", async () => {
    await setLanguage("id");
    expect(i18n.t("shell:sidebar.newResume")).toBe("Resume baru");

    await setLanguage("en");
    expect(i18n.t("shell:sidebar.newResume")).toBe("New resume");
  });

  it("fills a placeholder", () => {
    expect(i18n.t("commands:language.label", { language: "Bahasa" })).toBe(
      "Switch language to Bahasa",
    );
  });

  it("does not escape what it is given, because React already does", () => {
    expect(
      i18n.t("commands:language.label", { language: `Tom & "Jerry"` }),
    ).toBe(`Switch language to Tom & "Jerry"`);
  });
});
