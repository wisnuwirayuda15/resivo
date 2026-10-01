import { describe, expect, it } from "vitest";

import { TEMPLATE_IDS } from "@/features/resume/model/document";
import {
  createContact,
  createEmptyDocument,
  createSection,
  text,
} from "@/features/resume/model/index";
import { createSampleDocument } from "@/features/resume/sample";
import { templateDefaults } from "@/features/templates/defaults";

import i18n from "@/lib/i18n";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n/language";

import { checkDocument, RULES } from "./check";
import { contrastOnPaper } from "./contrast";
import { describeIssue } from "./describe";
import { ATS_RULE_NAMES, ruleName } from "./types";

import type {
  Block,
  DateRange,
  EntryBlock,
  ResumeDocument,
  Section,
} from "@/features/resume/model/document";

/**
 * Fixtures: a document that is clean on purpose, and a helper to dirty one part
 * of it. Starting from the clean one is what makes each test about one rule.
 */

const clean = (): ResumeDocument => createSampleDocument("classic");

const rulesOf = (document: ResumeDocument): Array<string> =>
  checkDocument(document).map((issue) => issue.rule);

const entry = (
  id: string,
  title: string,
  dateRange: DateRange | undefined,
  extra: Partial<EntryBlock> = {},
): EntryBlock => ({
  id,
  kind: "entry",
  title: text(title),
  bullets: [text("Did a thing")],
  ...(dateRange === undefined ? {} : { dateRange }),
  ...extra,
});

const withSections = (...sections: Array<Section>): ResumeDocument => {
  const document = clean();

  return {
    ...document,
    content: { ...document.content, sections },
  };
};

const experience = (...blocks: Array<Block>): Section =>
  createSection("experience", "Experience", blocks);

describe("checkDocument", () => {
  it.each(TEMPLATE_IDS)("finds nothing in the example resume on %s", (id) => {
    // The guard against a rule that is too eager. The example is what a new
    // user sees first, and it contains the cases a careless rule trips on: a
    // year-only entry with no end, an entry with no bullets, a phone with no
    // link.
    expect(checkDocument(createSampleDocument(id))).toEqual([]);
  });

  it("gives every issue an id, and words in each language", () => {
    const messy = createEmptyDocument();

    messy.customCss = ".a { display: none }";
    messy.design.typography.baseSize = 7;

    const issues = checkDocument(messy);

    expect(issues.length).toBeGreaterThan(3);

    for (const issue of issues) {
      expect(issue.id).toMatch(/^ats\.[a-z-]+:.+/);
      expect(ATS_RULE_NAMES).toContain(ruleName(issue.rule));

      for (const language of SUPPORTED_LANGUAGES) {
        const words = describeIssue(i18n.getFixedT(language, "ats"), issue);

        expect(words.message, `${language} ${issue.rule}`).not.toBe("");
        expect(words.why, `${language} ${issue.rule}`).not.toBe("");
        expect(words.where, `${language} ${issue.rule}`).not.toBe("");
        // A key that was not found comes back as the key, which would pass the
        // checks above.
        expect(words.message).not.toMatch(/^rules\./);
      }
    }
  });

  it("has words for every rule and for no rule that does not exist", () => {
    for (const language of SUPPORTED_LANGUAGES) {
      const filed = Object.keys(
        i18n.getResourceBundle(language, "ats").rules as object,
      ).sort();

      expect(filed, language).toEqual([...ATS_RULE_NAMES].sort());
    }
  });

  it("does not repeat an id, because the panel keys rows by it", () => {
    const messy = createEmptyDocument();
    const ids = checkDocument(messy).map((issue) => issue.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("lists errors before warnings before suggestions", () => {
    const order = { error: 0, warning: 1, info: 2 } as const;
    const severities = checkDocument(createEmptyDocument()).map(
      (issue) => order[issue.severity],
    );

    expect(severities).toEqual([...severities].sort((a, b) => a - b));
  });

  it("has one function per rule and nothing it runs twice", () => {
    expect(new Set(RULES).size).toBe(RULES.length);
  });
});

describe("contact rules", () => {
  it("flags a missing name as an error", () => {
    const document = clean();

    document.content.header.name = [];

    expect(checkDocument(document)).toContainEqual(
      expect.objectContaining({ rule: "ats.name-missing", severity: "error" }),
    );
  });

  it("finds an email by its link or by its text", () => {
    const byLink = clean();

    byLink.content.header.contacts = [
      createContact("Write to me", { href: "mailto:a@b.co" }),
    ];

    const byText = clean();

    byText.content.header.contacts = [createContact("a@b.co")];

    const neither = clean();

    neither.content.header.contacts = [createContact("London, UK")];

    expect(rulesOf(byLink)).not.toContain("ats.email-missing");
    expect(rulesOf(byText)).not.toContain("ats.email-missing");
    expect(rulesOf(neither)).toContain("ats.email-missing");
  });

  it("finds a phone by its link or by seven digits", () => {
    const byLink = clean();

    byLink.content.header.contacts = [
      createContact("Call", { href: "tel:+442079460958" }),
    ];

    const byText = clean();

    byText.content.header.contacts = [createContact("+44 (20) 7946-0958")];

    const street = clean();

    street.content.header.contacts = [createContact("221 Baker Street")];

    expect(rulesOf(byLink)).not.toContain("ats.phone-missing");
    expect(rulesOf(byText)).not.toContain("ats.phone-missing");
    expect(rulesOf(street)).toContain("ats.phone-missing");
  });

  it("flags a contact that is only an icon", () => {
    const document = clean();

    document.content.header.contacts = [
      ...document.content.header.contacts,
      createContact("", { icon: "envelope" }),
    ];

    expect(checkDocument(document)).toContainEqual(
      expect.objectContaining({
        rule: "ats.contact-icon-only",
        severity: "error",
      }),
    );
  });
});

describe("structure rules", () => {
  it("flags a visible empty section and offers to hide it", () => {
    const document = clean();

    document.content.sections.push(createSection("interests", "Interests"));

    const found = checkDocument(document).filter(
      (issue) => issue.rule === "ats.section-empty",
    );

    expect(found).toHaveLength(1);
    expect(found[0]?.fix).toBeDefined();
    expect(found[0]?.params).toEqual({ section: "Interests" });
  });

  it("ignores a hidden section altogether", () => {
    const document = clean();
    const empty = createSection("interests", "Interests");

    empty.hidden = true;
    document.content.sections.push(empty);

    expect(rulesOf(document)).not.toContain("ats.section-empty");
  });

  it("wants one of experience, education or projects with something in it", () => {
    const document = withSections(
      createSection("summary", "Summary", [
        { id: "p", kind: "paragraph", text: text("Hello") },
      ]),
      createSection("experience", "Experience"),
    );

    // An Experience heading with nothing under it does not count.
    expect(rulesOf(document)).toContain("ats.core-sections-missing");
    expect(rulesOf(clean())).not.toContain("ats.core-sections-missing");
  });

  it("reads a custom section whose heading is a known one as that kind", () => {
    const imported = createSection("custom", "Work Experience", [
      entry("e", "Analyst", { start: "2020" }),
    ]);

    expect(rulesOf(withSections(imported))).not.toContain(
      "ats.core-sections-missing",
    );
  });

  it("calls an unknown heading unusual, and stays quiet in a language it has no headings for", () => {
    const section = createSection("custom", "Volunteering", [
      entry("e", "Helper", { start: "2020" }),
    ]);
    const english = withSections(section);
    const german = withSections(section);

    german.meta = { ...german.meta, locale: "de" };

    expect(rulesOf(english)).toContain("ats.section-title-unusual");
    expect(rulesOf(german)).not.toContain("ats.section-title-unusual");
  });

  it("reads Indonesian headings as the kinds they name, and flags an unknown one", () => {
    const known = withSections(
      createSection("custom", "Pengalaman Kerja", [
        entry("e", "Analis", { start: "2020" }),
      ]),
    );
    const unknown = withSections(
      createSection("custom", "Kegiatan Sosial", [
        entry("e", "Relawan", { start: "2020" }),
      ]),
    );

    known.meta = { ...known.meta, locale: "id-ID" };
    unknown.meta = { ...unknown.meta, locale: "id-ID" };

    // A known heading is neither unusual nor a reason to say the resume has no
    // experience.
    expect(rulesOf(known)).not.toContain("ats.section-title-unusual");
    expect(rulesOf(known)).not.toContain("ats.core-sections-missing");
    expect(rulesOf(unknown)).toContain("ats.section-title-unusual");
  });

  it("flags two columns and offers one", () => {
    const document = clean();
    const [first] = document.content.sections;

    if (first === undefined) {
      throw new Error("sample has no sections");
    }

    first.style = { columns: 2 };

    const found = checkDocument(document).find(
      (issue) => issue.rule === "ats.columns-two",
    );

    expect(found?.fix).toBeDefined();
  });

  it("flags tables, raw blocks and images without alt text", () => {
    const document = withSections(
      experience(
        { id: "t", kind: "table", head: [], rows: [], align: [] },
        { id: "r", kind: "raw", markdown: "<b>x</b>" },
        { id: "i", kind: "image", imageId: "img", alt: "  " },
        { id: "j", kind: "image", imageId: "img", alt: "A portrait" },
        entry("e", "Analyst", { start: "2020" }),
      ),
    );

    const rules = rulesOf(document);

    expect(rules).toContain("ats.table-used");
    expect(rules).toContain("ats.raw-block");
    expect(
      rules.filter((rule) => rule === "ats.image-alt-missing"),
    ).toHaveLength(1);
  });

  it("notes a photo in the header", () => {
    const document = clean();

    document.content.header.avatarImageId = "img";

    expect(rulesOf(document)).toContain("ats.avatar-present");
  });

  it("flags a heading with no text as an error", () => {
    const document = clean();

    document.content.sections.push(
      createSection("custom", "", [
        { id: "p", kind: "paragraph", text: text("Orphan") },
      ]),
    );

    expect(checkDocument(document)).toContainEqual(
      expect.objectContaining({
        rule: "ats.section-title-empty",
        severity: "error",
      }),
    );
  });
});

describe("date rules", () => {
  const rulesFor = (...entries: Array<EntryBlock>): Array<string> =>
    rulesOf(withSections(experience(...entries)));

  it("flags an end before a start, in any precision", () => {
    expect(
      rulesFor(entry("a", "A", { start: "2021-06", end: "2021-01" })),
    ).toContain("ats.date-order");
    expect(rulesFor(entry("a", "A", { start: "2022", end: "2020" }))).toContain(
      "ats.date-order",
    );
  });

  it("does not call a year to the same year backwards", () => {
    expect(
      rulesFor(entry("a", "A", { start: "2019", end: "2019" })),
    ).not.toContain("ats.date-order");
  });

  it("ignores the end when the role is current", () => {
    expect(
      rulesFor(
        entry("a", "A", { start: "2021-06", end: "2020-01", current: true }),
      ),
    ).not.toContain("ats.date-order");
  });

  it("flags an end with no start, including a current role with none", () => {
    expect(rulesFor(entry("a", "A", { end: "2020" }))).toContain(
      "ats.date-start-missing",
    );
    expect(rulesFor(entry("a", "A", { current: true }))).toContain(
      "ats.date-start-missing",
    );
    expect(rulesFor(entry("a", "A", { start: "2020" }))).not.toContain(
      "ats.date-start-missing",
    );
  });

  it("flags dates written in words, but not a stale end behind current", () => {
    expect(
      rulesFor(entry("a", "A", { start: "Summer 2019", end: "2020" })),
    ).toContain("ats.date-unparsed");
    expect(
      rulesFor(
        entry("a", "A", { start: "2019", end: "Autumn", current: true }),
      ),
    ).not.toContain("ats.date-unparsed");
  });

  it("flags years and months mixed in one section, not across sections", () => {
    expect(
      rulesFor(
        entry("a", "A", { start: "2019", end: "2020" }),
        entry("b", "B", { start: "2021-03", end: "2022-01" }),
      ),
    ).toContain("ats.date-format-mixed");

    const split = withSections(
      experience(entry("a", "A", { start: "2021-03", end: "2022-01" })),
      createSection("education", "Education", [
        entry("b", "B", { start: "2015", end: "2019" }),
      ]),
    );

    expect(rulesOf(split)).not.toContain("ats.date-format-mixed");
  });

  it("flags a gap of more than six months between roles", () => {
    const found = checkDocument(
      withSections(
        experience(
          entry("a", "First", { start: "2018-01", end: "2019-01" }),
          entry("b", "Second", { start: "2019-12", end: "2020-06" }),
        ),
      ),
    ).filter((issue) => issue.rule === "ats.date-gap");

    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe("ats.date-gap:b");
    expect(found[0]?.params["months"]).toBe(11);
  });

  it("does not flag a gap of six months or less, or overlapping roles", () => {
    expect(
      rulesFor(
        entry("a", "First", { start: "2018-01", end: "2019-01" }),
        entry("b", "Second", { start: "2019-07", end: "2020-06" }),
      ),
    ).not.toContain("ats.date-gap");
    expect(
      rulesFor(
        entry("a", "First", { start: "2018-01", end: "2020-01" }),
        entry("b", "Second", { start: "2019-01", end: "2021-06" }),
      ),
    ).not.toContain("ats.date-gap");
  });

  it("does not guess about a timeline when a role's end is unknown", () => {
    // A start with no end could be over or ongoing, and a guess would report a
    // gap that is not there.
    expect(
      rulesFor(
        entry("a", "First", { start: "2018-01", end: "2018-06" }),
        entry("b", "Second", { start: "2021-01" }),
      ),
    ).not.toContain("ats.date-gap");
  });
});

describe("typography rules", () => {
  it("flags body text under 9.5pt and offers 10pt", () => {
    const document = clean();

    document.design.typography.baseSize = 8;

    const found = checkDocument(document).find(
      (issue) => issue.rule === "ats.font-size-small",
    );

    expect(found?.fix).toBeDefined();
    expect(found?.params).toMatchObject({ size: 8, fixSize: 10 });
  });

  it("accepts the technical template's own 10pt", () => {
    expect(rulesOf(createSampleDocument("technical"))).not.toContain(
      "ats.font-size-small",
    );
  });

  it("flags a narrow margin", () => {
    const document = clean();

    document.design.paper.margin = { top: 1, right: 0.2, bottom: 1, left: 0.8 };

    expect(rulesOf(document)).toContain("ats.margins-narrow");
  });

  it("flags text colours below 4.5 to 1 and skips ones it cannot read", () => {
    const pale = clean();

    pale.design.colors.muted = "#cccccc";

    const named = clean();

    named.design.colors.muted = "tomato";

    expect(rulesOf(pale)).toContain("ats.contrast-low");
    expect(rulesOf(named)).not.toContain("ats.contrast-low");
  });

  it("does not check the decorative rule colour", () => {
    const document = clean();

    // The default rule colour is 1.4 to 1 on purpose: it is a hairline.
    expect(contrastOnPaper(document.design.colors.rule)).toBeLessThan(2);
    expect(rulesOf(document)).not.toContain("ats.contrast-low");
  });

  it.each(TEMPLATE_IDS)(
    "has template colours on %s that pass, because the fix restores them",
    (id) => {
      const { colors } = templateDefaults(id);

      for (const token of ["text", "heading", "accent", "muted"] as const) {
        expect(contrastOnPaper(colors[token])).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it("notes an uploaded font in either slot", () => {
    const document = clean();

    document.design.typography.bodyFont = {
      family: "Mine",
      source: "custom",
      fontId: "f1",
    };
    document.design.typography.headingFont = {
      family: "Mine Display",
      source: "custom",
      fontId: "f2",
    };

    expect(
      checkDocument(document).filter(
        (issue) => issue.rule === "ats.font-custom",
      ),
    ).toHaveLength(2);
  });
});

describe("custom CSS rules", () => {
  const cssFor = (css: string): Array<string> =>
    checkDocument({ ...clean(), customCss: css }).map((issue) => issue.id);

  it.each([
    [".a { display: none }", "display-none"],
    [".a { visibility:hidden; }", "visibility-hidden"],
    [".a { font-size: 0 }", "font-size-zero"],
    [".a { font-size: 0px; }", "font-size-zero"],
    [".a { opacity: 0 }", "opacity-zero"],
    [".a { color: transparent }", "color-transparent"],
  ])("flags %s", (css, key) => {
    expect(cssFor(css)).toContain(`ats.css-hides-text:${key}`);
  });

  it.each([
    ".a { font-size: 0.9rem }",
    ".a { opacity: 0.5 }",
    ".a { opacity: 0.05 }",
    ".a { background-color: transparent }",
    ".a { display: flex }",
    "/* .a { display: none } */ .b { color: red }",
  ])("leaves %s alone", (css) => {
    expect(cssFor(css).filter((id) => id.startsWith("ats.css-hides"))).toEqual(
      [],
    );
  });

  it("flags text a stylesheet generates, but not content: none", () => {
    expect(cssFor('.a::before { content: "Skills: " }')).toContain(
      "ats.css-generated-content:css",
    );
    expect(cssFor(".a::after { content: none }")).not.toContain(
      "ats.css-generated-content:css",
    );
  });
});

describe("content rules", () => {
  const long = (length: number): string => "word ".repeat(length / 5);

  it("flags a bullet past 300 characters, in an entry or in a list", () => {
    const document = withSections(
      experience(
        entry("a", "A", { start: "2020" }, { bullets: [text(long(320))] }),
        {
          id: "l",
          kind: "bulletList",
          items: [{ text: text(long(320)) }, { text: text("Short") }],
        },
      ),
    );

    expect(
      checkDocument(document).filter(
        (issue) => issue.rule === "ats.bullet-long",
      ),
    ).toHaveLength(2);
  });

  it("flags a summary paragraph past 600 characters", () => {
    const document = withSections(
      createSection("summary", "Summary", [
        { id: "p", kind: "paragraph", text: text(long(640)) },
      ]),
      experience(entry("a", "A", { start: "2020" })),
    );

    expect(rulesOf(document)).toContain("ats.summary-long");
  });

  it("flags a role with neither bullets nor a description", () => {
    const empty = entry("a", "Analyst", { start: "2020" }, { bullets: [] });
    const described = entry(
      "b",
      "Analyst",
      { start: "2020" },
      { bullets: [], summary: text("Did a thing") },
    );

    expect(rulesOf(withSections(experience(empty)))).toContain(
      "ats.entry-empty",
    );
    expect(rulesOf(withSections(experience(described)))).not.toContain(
      "ats.entry-empty",
    );
  });

  it("only asks that of Experience, not of Education", () => {
    const degree = entry(
      "a",
      "Degree",
      { start: "2015", end: "2019" },
      { bullets: [] },
    );

    expect(
      rulesOf(
        withSections(
          experience(entry("e", "Analyst", { start: "2020" })),
          createSection("education", "Education", [degree]),
        ),
      ),
    ).not.toContain("ats.entry-empty");
  });
});

describe("length rule", () => {
  const withPages = (pageCount: number | null) =>
    checkDocument(clean(), { pageCount }).filter(
      (issue) => issue.rule === "ats.page-count",
    );

  it("flags a resume past two pages and says how many", () => {
    const found = withPages(3);

    expect(found).toHaveLength(1);
    expect(found[0]?.params).toEqual({ count: 3 });
    expect(found[0]?.severity).toBe("warning");
  });

  it("accepts one page and two", () => {
    expect(withPages(1)).toEqual([]);
    expect(withPages(2)).toEqual([]);
  });

  it("says nothing when nobody measured, rather than guessing", () => {
    expect(withPages(null)).toEqual([]);
    // And a caller with no paper to ask gets the same.
    expect(
      checkDocument(clean()).filter((issue) => issue.rule === "ats.page-count"),
    ).toEqual([]);
  });
});
