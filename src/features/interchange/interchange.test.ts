import { describe, expect, it } from "vitest";

import { LocalizedError } from "@/lib/i18n/LocalizedError";
import { documentFromMarkdown } from "@/features/markdown/index";
import {
  createEmptyDocument,
  documentSchema,
  plainText,
} from "@/features/resume/model/index";
import { createSampleDocument } from "@/features/resume/sample";
import { RANGE_DASH } from "@/features/templates/renderer/dates";

import { detectImportFormat, importDocument } from "./index";
import { fromJsonResume, isJsonResume, toJsonResume } from "./jsonResume";
import { textToMarkdown, toPlainText } from "./plainText";

import type { ResumeDocument } from "@/features/resume/model/document";

const names = (document: ResumeDocument) =>
  document.content.sections.map((section) => plainText(section.title));

/** A JSON Resume with a little of everything, in the shape the project's own
 * documentation uses. */
const FILE = {
  basics: {
    name: "Grace Hopper",
    label: "Computer scientist",
    email: "grace@example.com",
    phone: "+1 202 555 0100",
    url: "https://grace.example.com/",
    summary: "Wrote the first compiler.",
    image: "https://example.com/grace.jpg",
    location: { city: "Arlington", region: "VA", countryCode: "US" },
    profiles: [
      { network: "GitHub", username: "grace", url: "https://github.com/grace" },
    ],
  },
  work: [
    {
      name: "Remington Rand",
      position: "Senior Mathematician",
      url: "https://example.com",
      startDate: "1949-04-15",
      endDate: "1959-12-31",
      summary: "Built the A-0 system.",
      highlights: ["Wrote the first compiler", "Led a team"],
    },
    { name: "US Navy", position: "Rear Admiral", startDate: "1967" },
  ],
  education: [
    {
      institution: "Yale University",
      studyType: "PhD",
      area: "Mathematics",
      startDate: "1930",
      endDate: "1934",
      score: "4.0",
      courses: ["Algebra"],
    },
  ],
  skills: [
    { name: "Languages", level: "Master", keywords: ["COBOL", "FLOW-MATIC"] },
    { name: "Methods", keywords: ["Compilers", "Standards"] },
  ],
  languages: [{ language: "English", fluency: "Native speaker" }],
  interests: [{ name: "Sailing" }],
  awards: [{ title: "Medal of Freedom", date: "1991-11-21", awarder: "US" }],
  certificates: [{ name: "Naval reserve", issuer: "Navy", date: "1943" }],
  publications: [
    {
      name: "The Education of a Computer",
      publisher: "ACM",
      releaseDate: "1952",
    },
  ],
  projects: [
    {
      name: "COBOL",
      description: "A business language",
      keywords: ["language"],
      url: "https://example.com",
    },
  ],
  volunteer: [
    { organization: "Scouts", position: "Leader", startDate: "1950" },
  ],
  references: [{ name: "A. Colleague", reference: "A fine mind." }],
  unknownKey: { anything: true },
};

const base = () => createEmptyDocument("classic", "en");

describe("fromJsonResume", () => {
  it("maps every section the format has onto the model, in reading order", () => {
    const { document } = fromJsonResume(FILE, base());

    expect(plainText(document.content.header.name)).toBe("Grace Hopper");
    expect(plainText(document.content.header.headline ?? [])).toBe(
      "Computer scientist",
    );
    expect(names(document)).toEqual([
      "Summary",
      "Experience",
      "Volunteering",
      "Education",
      "Projects",
      "Skills",
      "Certifications",
      "Awards",
      "Publications",
      "Languages",
      "Interests",
      "References",
    ]);
  });

  it("writes contacts with the right icons and only safe links", () => {
    const { document } = fromJsonResume(
      {
        basics: {
          name: "A",
          email: "a@example.com",
          url: "javascript:alert(1)",
          profiles: [{ network: "LinkedIn", url: "https://linkedin.com/in/a" }],
        },
      },
      base(),
    );
    const contacts = document.content.header.contacts;

    expect(contacts.map((contact) => contact.icon?.name)).toEqual([
      "envelope",
      "globe",
      "linkedin-logo",
    ]);
    expect(contacts[0]?.href).toBe("mailto:a@example.com");
    // The scheme is refused, the text stays as the person wrote it.
    expect(contacts[1]?.href).toBeUndefined();
    expect(contacts[2]?.href).toBe("https://linkedin.com/in/a");
  });

  it("keeps a month, treats a missing end as present, and leaves an award a point in time", () => {
    const { document } = fromJsonResume(FILE, base());
    const experience = document.content.sections.find(
      (section) => section.kind === "experience",
    );
    const awards = document.content.sections.find(
      (section) => section.kind === "awards",
    );
    const jobs = experience?.blocks.filter((block) => block.kind === "entry");
    const award = awards?.blocks[0];

    expect(jobs?.[0]).toMatchObject({
      dateRange: { start: "1949-04", end: "1959-12" },
    });
    expect(jobs?.[1]).toMatchObject({
      dateRange: { start: "1967", current: true },
    });
    expect(award).toMatchObject({ dateRange: { start: "1991-11" } });
    expect(award).not.toHaveProperty("dateRange.current");
  });

  it("groups skills under a heading only when there is more than one group", () => {
    const { document } = fromJsonResume(FILE, base());
    const skills = document.content.sections.find(
      (section) => section.kind === "skills",
    );

    expect(skills?.blocks.map((block) => block.kind)).toEqual([
      "heading",
      "tagList",
      "heading",
      "tagList",
    ]);

    const single = fromJsonResume(
      { skills: [{ name: "Skills", keywords: ["A", "B"] }] },
      base(),
    );

    expect(
      single.document.content.sections[0]?.blocks.map((block) => block.kind),
    ).toEqual(["tagList"]);
  });

  it("says what it could not keep", () => {
    expect(fromJsonResume(FILE, base()).dropped).toEqual([
      "image",
      "urls",
      "score",
      "courses",
      "level",
      "keywords",
    ]);
    expect(fromJsonResume({ basics: { name: "A" } }, base()).dropped).toEqual(
      [],
    );
  });

  it("survives wrong types and keeps the items that parse", () => {
    const { document } = fromJsonResume(
      {
        basics: { name: 42, label: "Real" },
        work: [null, "nope", { position: "Kept", highlights: "not a list" }],
        skills: "not an array",
      },
      base(),
    );

    expect(plainText(document.content.header.name)).toBe("");
    expect(plainText(document.content.header.headline ?? [])).toBe("Real");
    expect(document.content.sections).toHaveLength(1);
    expect(document.content.sections[0]?.blocks).toHaveLength(1);
  });

  it("refuses JSON that is not a resume, with a key a screen can translate", () => {
    expect(isJsonResume({ hello: "world" })).toBe(false);
    expect(isJsonResume([])).toBe(false);
    expect(isJsonResume(null)).toBe(false);

    let caught: unknown;

    try {
      fromJsonResume({ hello: "world" }, base());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(LocalizedError);
    expect((caught as LocalizedError).key).toBe(
      "library:create.errors.notJsonResume",
    );
  });

  it("names the two custom sections in the document's language", () => {
    const { document } = fromJsonResume(
      FILE,
      createEmptyDocument("classic", "id"),
    );

    expect(names(document)).toContain("Kegiatan sukarela");
    expect(names(document)).toContain("Referensi");
    expect(names(document)).toContain("Pengalaman");
  });

  it("always produces a document the schema accepts", () => {
    expect(
      documentSchema.safeParse(fromJsonResume(FILE, base()).document).success,
    ).toBe(true);
    expect(
      documentSchema.safeParse(fromJsonResume({ basics: {} }, base()).document)
        .success,
    ).toBe(true);
  });
});

describe("toJsonResume", () => {
  it("writes the example resume's identity, work, education and skills", () => {
    const json = toJsonResume(createSampleDocument("classic"));

    expect(json.basics.name).toBe("Ada Lovelace");
    expect(json.basics.email).toBe("ada@example.com");
    expect(json.basics.phone).toBe("+44 20 7946 0958");
    expect(json.basics.location).toEqual({ address: "London, UK" });
    expect(json.basics.url).toBe("https://ada.example.com");
    expect(json.work[0]).toMatchObject({
      position: "Analyst",
      name: "Difference Engine Co.",
      startDate: "1842-10",
    });
    // A current role is an absent end, which is how the format says it.
    expect(json.work[0]?.endDate).toBeUndefined();
    expect(json.work[1]?.endDate).toBe("1842-09");
    expect(json.skills.length).toBeGreaterThan(0);
  });

  it("leaves out hidden sections", () => {
    const document = createSampleDocument("classic");
    const experience = document.content.sections.find(
      (section) => section.kind === "experience",
    );

    if (experience !== undefined) {
      experience.hidden = true;
    }

    expect(toJsonResume(document).work).toEqual([]);
  });

  it("serialises without the keys it had nothing for", () => {
    const text = JSON.stringify(toJsonResume(createEmptyDocument()));

    expect(text).not.toContain("undefined");
    expect(text).toContain("$schema");
  });

  it("reads back to the same name, entries, dates, bullets and tags", () => {
    const original = createSampleDocument("classic");
    const back = fromJsonResume(
      JSON.parse(JSON.stringify(toJsonResume(original))),
      base(),
    ).document;

    expect(plainText(back.content.header.name)).toBe("Ada Lovelace");

    const entries = (document: ResumeDocument, kind: string) =>
      document.content.sections
        .find((section) => section.kind === kind)
        ?.blocks.flatMap((block) =>
          block.kind === "entry"
            ? [
                {
                  title: plainText(block.title),
                  subtitle: plainText(block.subtitle ?? []),
                  range: block.dateRange,
                  bullets: block.bullets.map((bullet) => plainText(bullet)),
                },
              ]
            : [],
        );

    expect(entries(back, "experience")).toEqual(
      entries(original, "experience"),
    );

    const tags = (document: ResumeDocument) =>
      document.content.sections
        .find((section) => section.kind === "skills")
        ?.blocks.flatMap((block) =>
          block.kind === "tagList" ? block.tags : [],
        );

    expect(tags(back)).toEqual(tags(original));
  });
});

describe("toPlainText", () => {
  const text = toPlainText(createSampleDocument("classic"));

  it("starts with the name, the headline and the contacts on one line", () => {
    const lines = text.split("\n");

    expect(lines[0]).toBe("Ada Lovelace");
    expect(lines[1]).toBe("Mathematician, and the first programmer");
    expect(lines[2]).toContain("ada@example.com | +44 20 7946 0958");
  });

  it("sets sections in capitals and entries on one line with their dates", () => {
    expect(text).toContain("\nEXPERIENCE\n");
    expect(text).toContain(
      `Analyst, Difference Engine Co., London (Oct 1842 ${RANGE_DASH} Present)`,
    );
    expect(text).toContain("- Wrote Note G");
  });

  it("writes a link as its label and its address", () => {
    const document = createEmptyDocument();

    document.content.header.name = [
      {
        type: "link",
        href: "https://x.example",
        children: [{ type: "text", text: "my site" }],
      },
    ];

    expect(toPlainText(document)).toContain("my site (https://x.example)");
  });

  it("skips hidden sections", () => {
    const document = createSampleDocument("classic");

    for (const section of document.content.sections) {
      section.hidden = true;
    }

    expect(toPlainText(document)).not.toContain("EXPERIENCE");
  });
});

describe("textToMarkdown", () => {
  const TEXT = [
    "GRACE HOPPER",
    "Computer scientist",
    "grace@example.com | +1 202 555 0100 | github.com/grace",
    "Arlington, VA",
    "",
    "SUMMARY",
    "Wrote the first compiler.",
    "",
    "WORK HISTORY",
    "Senior Mathematician, Remington Rand (1949 - 1959)",
    "• Wrote the first compiler",
    "  and tested it on a UNIVAC",
    "• Led a team",
    "",
    "Education:",
    "PhD Mathematics, Yale",
    "",
    "SKILLS",
    "-------",
    "COBOL, FLOW-MATIC",
  ].join("\n");

  const parsed = documentFromMarkdown(base(), textToMarkdown(TEXT));

  it("takes the name, the headline and the contacts from the top", () => {
    const { header } = parsed.document.content;

    expect(plainText(header.name)).toBe("GRACE HOPPER");
    expect(plainText(header.headline ?? [])).toBe("Computer scientist");
    expect(header.contacts.map((contact) => contact.icon?.name)).toEqual([
      "envelope",
      "phone",
      "github-logo",
      "map-pin",
    ]);
  });

  it("finds sections by their usual names, in capitals, with a colon or an underline", () => {
    expect(
      parsed.document.content.sections.map((section) => section.kind),
    ).toEqual(["summary", "experience", "education", "skills"]);
    expect(names(parsed.document)).toEqual([
      "Summary",
      "Work History",
      "Education",
      "Skills",
    ]);
  });

  it("turns bullet characters into a list and joins a wrapped line to its bullet", () => {
    const experience = parsed.document.content.sections[1];
    const list = experience?.blocks.find(
      (block) => block.kind === "bulletList",
    );

    expect(list?.kind === "bulletList" ? list.items : []).toHaveLength(2);
    expect(
      list?.kind === "bulletList" ? plainText(list.items[0]?.text ?? []) : "",
    ).toBe("Wrote the first compiler and tested it on a UNIVAC");
  });

  it("reads without a warning", () => {
    expect(parsed.warnings).toEqual([]);
  });

  it("does not let a line turn into Markdown it was not", () => {
    const { document, warnings } = documentFromMarkdown(
      base(),
      textToMarkdown("A Name\n\nSKILLS\n#hashtag and *stars* and <b>tags</b>"),
    );
    const block = document.content.sections[0]?.blocks[0];

    expect(warnings).toEqual([]);
    expect(block?.kind === "paragraph" ? plainText(block.text) : "").toBe(
      "#hashtag and *stars* and <b>tags</b>",
    );
  });

  it("reads text that has no headings at all as one run under the name", () => {
    const { document } = documentFromMarkdown(
      base(),
      textToMarkdown("Just A Name\nsome words\nmore words"),
    );

    expect(plainText(document.content.header.name)).toBe("Just A Name");
    expect(document.content.sections.length).toBeGreaterThan(0);
  });

  it("returns nothing for nothing", () => {
    expect(textToMarkdown("  \n \n")).toBe("");
  });

  it("reads the text this app writes back to the same sections", () => {
    const written = toPlainText(createSampleDocument("classic"));
    const { document } = documentFromMarkdown(base(), textToMarkdown(written));

    expect(plainText(document.content.header.name)).toBe("Ada Lovelace");
    expect(document.content.sections.map((section) => section.kind)).toEqual(
      createSampleDocument("classic").content.sections.map(
        (section) => section.kind,
      ),
    );
  });
});

describe("detectImportFormat", () => {
  it.each([
    ["resume.json", "{}", "json-resume"],
    ["resume.txt", '  {"basics":{}}', "json-resume"],
    ["resume.md", "# Name\n\ntext", "markdown"],
    ["resume.txt", 'text\n:::entry{title="x"}\n:::', "markdown"],
    ["resume.txt", "Name\nEXPERIENCE\nthings", "text"],
    ["resume.md", "no headings, just words", "text"],
  ] as const)("%s with %j is %s", (name, source, expected) => {
    expect(detectImportFormat(name, source)).toBe(expected);
  });
});

describe("importDocument", () => {
  it("makes a valid document of each format, on the template it was given", () => {
    const empty = createEmptyDocument("bold", "en");
    const results = [
      importDocument("a.json", JSON.stringify(FILE), empty),
      importDocument("a.md", "# Ada\n\n## Summary\n\nHello", empty),
      importDocument("a.txt", "Ada\nSUMMARY\nHello", empty),
    ];

    expect(results.map((result) => result.format)).toEqual([
      "json-resume",
      "markdown",
      "text",
    ]);

    for (const result of results) {
      expect(result.document.templateId).toBe("bold");
      expect(documentSchema.safeParse(result.document).success).toBe(true);
    }

    expect(results[0]?.fullName).toBe("Grace Hopper");
    expect(results[1]?.fullName).toBe("Ada");
  });

  it("refuses a JSON file that does not parse, and one that is not a resume", () => {
    const empty = createEmptyDocument();
    const keyOf = (source: string) => {
      try {
        importDocument("a.json", source, empty);
      } catch (error) {
        return error instanceof LocalizedError ? error.key : "other";
      }

      return "none";
    };

    expect(keyOf("{ nope")).toBe("library:create.errors.invalidJson");
    expect(keyOf('{"hello":1}')).toBe("library:create.errors.notJsonResume");
  });

  it("refuses a name too long for the document schema, rather than saving it", () => {
    const empty = createEmptyDocument();
    let key = "none";

    try {
      importDocument(
        "a.json",
        JSON.stringify({ basics: { name: "x".repeat(300) } }),
        empty,
      );
    } catch (error) {
      key = error instanceof LocalizedError ? error.key : "other";
    }

    expect(key).toBe("library:create.errors.invalid");
  });
});
