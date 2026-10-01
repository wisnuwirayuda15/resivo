import { z } from "zod";

import { createId } from "@/lib/id";
import { LocalizedError } from "@/lib/i18n/LocalizedError";
import {
  createContact,
  plainText,
  syncMeta,
  text,
} from "@/features/resume/model/index";
import { sectionTitle } from "@/features/resume/model/sectionTitles";

import type {
  Block,
  DateRange,
  EntryBlock,
  InlineText,
  ResumeDocument,
  Section,
  SectionKind,
} from "@/features/resume/model/document";

/**
 * JSON Resume, in both directions.
 *
 * https://jsonresume.org/schema is the closest thing this corner of the world
 * has to a shared format, and it is what most other tools can read or write, so
 * it is the one worth being able to leave and arrive by. It is a *content*
 * format: it has no templates, no tokens and no layout, so what travels is the
 * words, the dates and the structure, and what does not is called out rather
 * than dropped quietly.
 *
 * The reader is lenient on purpose. A file in the wild has a number where the
 * schema says a string, a missing array, a field from a newer revision, and
 * rejecting the whole file for any of those would refuse most of what people
 * actually have. Each field falls back to absent, each list keeps the items
 * that parse, and keys the schema does not name are discarded. The result is
 * still checked against the document schema by the caller, which is where
 * "valid" is decided.
 */

// ---------------------------------------------------------------------------
// The shape that is read
// ---------------------------------------------------------------------------

const str = z.string().optional().catch(undefined);

/** A list that keeps the items which parse and shrugs off the rest. */
const list = <TSchema extends z.ZodType>(item: TSchema) =>
  z
    .array(z.unknown())
    .optional()
    .catch(undefined)
    .transform((items) =>
      items?.flatMap((candidate) => {
        const parsed = item.safeParse(candidate);

        return parsed.success ? [parsed.data] : [];
      }),
    );

const strings = z
  .array(z.string())
  .optional()
  .catch(undefined)
  .transform((items) => items?.filter((item) => item.trim() !== ""));

const profileSchema = z.object({
  network: str,
  username: str,
  url: str,
});

const basicsSchema = z.object({
  name: str,
  label: str,
  image: str,
  email: str,
  phone: str,
  url: str,
  summary: str,
  location: z
    .object({
      address: str,
      postalCode: str,
      city: str,
      countryCode: str,
      region: str,
    })
    .optional()
    .catch(undefined),
  profiles: list(profileSchema),
});

const workSchema = z.object({
  name: str,
  position: str,
  url: str,
  location: str,
  startDate: str,
  endDate: str,
  summary: str,
  highlights: strings,
});

const volunteerSchema = z.object({
  organization: str,
  position: str,
  url: str,
  startDate: str,
  endDate: str,
  summary: str,
  highlights: strings,
});

const educationSchema = z.object({
  institution: str,
  url: str,
  area: str,
  studyType: str,
  startDate: str,
  endDate: str,
  score: str,
  courses: strings,
});

const awardSchema = z.object({
  title: str,
  date: str,
  awarder: str,
  summary: str,
});

const certificateSchema = z.object({
  name: str,
  date: str,
  issuer: str,
  url: str,
});

const publicationSchema = z.object({
  name: str,
  publisher: str,
  releaseDate: str,
  url: str,
  summary: str,
});

const skillSchema = z.object({
  name: str,
  level: str,
  keywords: strings,
});

const languageSchema = z.object({ language: str, fluency: str });

const interestSchema = z.object({ name: str, keywords: strings });

const referenceSchema = z.object({ name: str, reference: str });

const projectSchema = z.object({
  name: str,
  description: str,
  highlights: strings,
  keywords: strings,
  startDate: str,
  endDate: str,
  url: str,
});

const jsonResumeSchema = z.object({
  basics: basicsSchema.optional().catch(undefined),
  work: list(workSchema),
  volunteer: list(volunteerSchema),
  education: list(educationSchema),
  awards: list(awardSchema),
  certificates: list(certificateSchema),
  publications: list(publicationSchema),
  skills: list(skillSchema),
  languages: list(languageSchema),
  interests: list(interestSchema),
  references: list(referenceSchema),
  projects: list(projectSchema),
});

type Parsed = z.output<typeof jsonResumeSchema>;

// ---------------------------------------------------------------------------
// What a file can carry that a resume here cannot
// ---------------------------------------------------------------------------

/**
 * A field the file had and the document has no place for. Reported by code so
 * the dialog can say each in the interface's language, and so a test can name
 * the one it expects.
 */
export const DROPPED_FIELDS = [
  "image",
  "urls",
  "score",
  "courses",
  "level",
  "keywords",
] as const;
export type DroppedField = (typeof DROPPED_FIELDS)[number];

export interface JsonResumeImport {
  document: ResumeDocument;
  dropped: Array<DroppedField>;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * Whether a parsed value looks like JSON Resume at all.
 *
 * An object that has `basics` as an object, or at least one of the section
 * arrays. Anything else is some other JSON file that happens to have been chosen,
 * and the useful thing to say about it is that it is not a resume.
 */
export const isJsonResume = (value: unknown): boolean => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    (typeof record.basics === "object" && record.basics !== null) ||
    ["work", "education", "skills", "projects"].some((key) =>
      Array.isArray(record[key]),
    )
  );
};

/** Only the schemes a link in a resume can sensibly have. A file is untrusted
 * input, and `javascript:` is the one that matters. */
const SAFE_HREF = /^(?:https?:\/\/|mailto:|tel:)/i;

const safeHref = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();

  return trimmed !== undefined && SAFE_HREF.test(trimmed) ? trimmed : undefined;
};

/** `https://github.com/ada/` as it would be written on a business card. */
const bare = (url: string): string =>
  url
    .replace(/^[a-z]+:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");

const present = (value: string | undefined): value is string =>
  value !== undefined && value.trim() !== "";

/**
 * A date as the model stores one.
 *
 * JSON Resume writes ISO dates down to the day, and the paper never prints a
 * day, so `2021-03-15` is kept as `2021-03`. A year stays a year. Anything else
 * (a season, a phrase) is the author's own text and is passed through, which is
 * what the model's "free text otherwise" is for.
 */
const modelDate = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();

  if (trimmed === undefined || trimmed === "") {
    return undefined;
  }

  const day = /^(\d{4}-\d{2})-\d{2}$/.exec(trimmed);

  return day?.[1] ?? trimmed;
};

/**
 * A range from the file's two dates.
 *
 * In JSON Resume a start with no end means the role has not ended, which is how
 * "Present" is written, so `openEnded` turns it into `current`. A single date on
 * an award or a certificate is a point in time and must not become "to Present".
 */
const range = (
  start: string | undefined,
  end: string | undefined,
  openEnded: boolean,
): DateRange | undefined => {
  const from = modelDate(start);
  const to = modelDate(end);

  if (from === undefined && to === undefined) {
    return undefined;
  }

  if (from !== undefined && to === undefined && openEnded) {
    return { start: from, current: true };
  }

  return {
    ...(from === undefined ? {} : { start: from }),
    ...(to === undefined ? {} : { end: to }),
  };
};

const paragraph = (value: string): Block => ({
  id: createId(),
  kind: "paragraph",
  text: text(value),
});

const entry = (fields: {
  title: string | undefined;
  subtitle?: string | undefined;
  location?: string | undefined;
  dateRange?: DateRange | undefined;
  summary?: string | undefined;
  bullets?: Array<string> | undefined;
}): EntryBlock => ({
  id: createId(),
  kind: "entry",
  title: text(fields.title ?? ""),
  ...(present(fields.subtitle) ? { subtitle: text(fields.subtitle) } : {}),
  ...(present(fields.location) ? { location: text(fields.location) } : {}),
  ...(fields.dateRange === undefined ? {} : { dateRange: fields.dateRange }),
  ...(present(fields.summary) ? { summary: text(fields.summary) } : {}),
  bullets: (fields.bullets ?? []).map((bullet) => text(bullet)),
});

const tagList = (tags: Array<string>): Block => ({
  id: createId(),
  kind: "tagList",
  tags,
});

const section = (
  kind: SectionKind,
  title: string,
  blocks: Array<Block>,
): Section => ({
  id: createId(),
  kind,
  title: text(title),
  blocks,
});

/**
 * Titles for the two sections that are `custom` here, in the document's own
 * language. The kinds that exist in the model take theirs from `sectionTitle`.
 */
const CUSTOM_TITLES = {
  en: { volunteer: "Volunteering", references: "References" },
  id: { volunteer: "Kegiatan sukarela", references: "Referensi" },
} as const;

const customTitle = (name: "volunteer" | "references", locale: string) =>
  CUSTOM_TITLES[locale.toLowerCase().startsWith("id") ? "id" : "en"][name];

/** The icon for a profile on a network people name in a resume. */
const NETWORK_ICONS: Record<string, string> = {
  github: "github-logo",
  linkedin: "linkedin-logo",
  twitter: "twitter-logo",
  x: "twitter-logo",
};

const joined = (...parts: Array<string | undefined>): string =>
  parts.filter(present).join(", ");

/**
 * Builds a document out of a JSON Resume file.
 *
 * `base` supplies what the file has no opinion about (the template, the design
 * tokens, the language) and its content is replaced wholesale. The order of the
 * sections is the one a resume is usually read in, not the file's key order,
 * which is arbitrary.
 *
 * Throws a `LocalizedError` when the value is not JSON Resume.
 */
export const fromJsonResume = (
  value: unknown,
  base: ResumeDocument,
): JsonResumeImport => {
  if (!isJsonResume(value)) {
    throw new LocalizedError(
      "This JSON file is not a JSON Resume.",
      "library:create.errors.notJsonResume",
    );
  }

  const file: Parsed = jsonResumeSchema.parse(value);
  const locale = base.meta.locale;
  const dropped = new Set<DroppedField>();
  const basics = file.basics;

  // ---- Header ----

  const contacts = [];

  if (present(basics?.email)) {
    contacts.push(
      createContact(basics.email, {
        icon: "envelope",
        href: `mailto:${basics.email.trim()}`,
      }),
    );
  }

  if (present(basics?.phone)) {
    contacts.push(createContact(basics.phone, { icon: "phone" }));
  }

  const place = joined(
    basics?.location?.address,
    basics?.location?.city,
    basics?.location?.region,
    basics?.location?.countryCode,
  );

  if (place !== "") {
    contacts.push(createContact(place, { icon: "map-pin" }));
  }

  if (present(basics?.url)) {
    const href = safeHref(basics.url);

    contacts.push(
      createContact(bare(basics.url.trim()), {
        icon: "globe",
        ...(href === undefined ? {} : { href }),
      }),
    );
  }

  for (const profile of basics?.profiles ?? []) {
    const label = present(profile.url)
      ? bare(profile.url.trim())
      : (profile.username ?? profile.network);

    if (!present(label)) {
      continue;
    }

    const href = safeHref(profile.url);

    contacts.push(
      createContact(label, {
        icon:
          NETWORK_ICONS[profile.network?.trim().toLowerCase() ?? ""] ?? "globe",
        ...(href === undefined ? {} : { href }),
      }),
    );
  }

  if (present(basics?.image)) {
    dropped.add("image");
  }

  // ---- Sections ----

  const sections: Array<Section> = [];

  if (present(basics?.summary)) {
    sections.push(
      section("summary", sectionTitle("summary", locale), [
        paragraph(basics.summary.trim()),
      ]),
    );
  }

  const noteUrl = (url: string | undefined) => {
    if (present(url)) {
      dropped.add("urls");
    }
  };

  if (file.work !== undefined && file.work.length > 0) {
    sections.push(
      section(
        "experience",
        sectionTitle("experience", locale),
        file.work.map((job) => {
          noteUrl(job.url);

          return entry({
            title: job.position,
            subtitle: job.name,
            location: job.location,
            dateRange: range(job.startDate, job.endDate, true),
            summary: job.summary,
            bullets: job.highlights,
          });
        }),
      ),
    );
  }

  if (file.volunteer !== undefined && file.volunteer.length > 0) {
    sections.push(
      section(
        "custom",
        customTitle("volunteer", locale),
        file.volunteer.map((item) => {
          noteUrl(item.url);

          return entry({
            title: item.position,
            subtitle: item.organization,
            dateRange: range(item.startDate, item.endDate, true),
            summary: item.summary,
            bullets: item.highlights,
          });
        }),
      ),
    );
  }

  if (file.education !== undefined && file.education.length > 0) {
    sections.push(
      section(
        "education",
        sectionTitle("education", locale),
        file.education.map((school) => {
          noteUrl(school.url);

          if (present(school.score)) {
            dropped.add("score");
          }

          if ((school.courses ?? []).length > 0) {
            dropped.add("courses");
          }

          return entry({
            title: joined(school.studyType, school.area),
            subtitle: school.institution,
            dateRange: range(school.startDate, school.endDate, false),
          });
        }),
      ),
    );
  }

  if (file.projects !== undefined && file.projects.length > 0) {
    sections.push(
      section(
        "projects",
        sectionTitle("projects", locale),
        file.projects.map((project) => {
          noteUrl(project.url);

          if ((project.keywords ?? []).length > 0) {
            dropped.add("keywords");
          }

          return entry({
            title: project.name,
            summary: project.description,
            dateRange: range(project.startDate, project.endDate, false),
            bullets: project.highlights,
          });
        }),
      ),
    );
  }

  if (file.skills !== undefined && file.skills.length > 0) {
    const groups = file.skills.filter(
      (skill) => present(skill.name) || (skill.keywords ?? []).length > 0,
    );
    const blocks: Array<Block> = [];

    for (const group of groups) {
      if (present(group.level)) {
        dropped.add("level");
      }

      // A skill with no keywords is a keyword: "Python" written as a group of
      // its own with nothing under it.
      const tags =
        (group.keywords ?? []).length > 0
          ? (group.keywords ?? [])
          : present(group.name)
            ? [group.name]
            : [];

      // A heading only where there is more than one group to tell apart. One
      // group's name ("Skills") would repeat the section title above it.
      if (
        groups.length > 1 &&
        (group.keywords ?? []).length > 0 &&
        present(group.name)
      ) {
        blocks.push({
          id: createId(),
          kind: "heading",
          level: 3,
          text: text(group.name.trim()),
        });
      }

      if (tags.length > 0) {
        blocks.push(tagList(tags));
      }
    }

    if (blocks.length > 0) {
      sections.push(section("skills", sectionTitle("skills", locale), blocks));
    }
  }

  if (file.certificates !== undefined && file.certificates.length > 0) {
    sections.push(
      section(
        "certifications",
        sectionTitle("certifications", locale),
        file.certificates.map((certificate) => {
          noteUrl(certificate.url);

          return entry({
            title: certificate.name,
            subtitle: certificate.issuer,
            dateRange: range(certificate.date, undefined, false),
          });
        }),
      ),
    );
  }

  if (file.awards !== undefined && file.awards.length > 0) {
    sections.push(
      section(
        "awards",
        sectionTitle("awards", locale),
        file.awards.map((award) =>
          entry({
            title: award.title,
            subtitle: award.awarder,
            dateRange: range(award.date, undefined, false),
            summary: award.summary,
          }),
        ),
      ),
    );
  }

  if (file.publications !== undefined && file.publications.length > 0) {
    sections.push(
      section(
        "publications",
        sectionTitle("publications", locale),
        file.publications.map((publication) => {
          noteUrl(publication.url);

          return entry({
            title: publication.name,
            subtitle: publication.publisher,
            dateRange: range(publication.releaseDate, undefined, false),
            summary: publication.summary,
          });
        }),
      ),
    );
  }

  const spoken = (file.languages ?? [])
    .filter((item) => present(item.language))
    .map((item) =>
      present(item.fluency)
        ? `${item.language?.trim() ?? ""} (${item.fluency.trim()})`
        : (item.language?.trim() ?? ""),
    );

  if (spoken.length > 0) {
    sections.push(
      section("languages", sectionTitle("languages", locale), [
        tagList(spoken),
      ]),
    );
  }

  const interests = (file.interests ?? [])
    .map((item) => item.name?.trim() ?? "")
    .filter((name) => name !== "");

  if (interests.length > 0) {
    sections.push(
      section("interests", sectionTitle("interests", locale), [
        tagList(interests),
      ]),
    );
  }

  const references = (file.references ?? []).filter(
    (item) => present(item.reference) || present(item.name),
  );

  if (references.length > 0) {
    sections.push(
      section(
        "custom",
        customTitle("references", locale),
        references.flatMap((item): Array<Block> => [
          ...(present(item.reference)
            ? [
                {
                  id: createId(),
                  kind: "quote" as const,
                  paragraphs: [text(item.reference.trim())],
                },
              ]
            : []),
          ...(present(item.name) ? [paragraph(item.name.trim())] : []),
        ]),
      ),
    );
  }

  const document = syncMeta({
    ...base,
    content: {
      header: {
        name: text(basics?.name?.trim() ?? ""),
        ...(present(basics?.label)
          ? { headline: text(basics.label.trim()) }
          : {}),
        contacts,
      },
      sections,
    },
  });

  return {
    document,
    dropped: DROPPED_FIELDS.filter((field) => dropped.has(field)),
  };
};

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/**
 * What is written. Every field is optional and may be `undefined`, which
 * `JSON.stringify` leaves out, so the builders below can assign without
 * guarding each one.
 */
export interface JsonResume {
  $schema: string;
  basics: {
    name?: string | undefined;
    label?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    url?: string | undefined;
    summary?: string | undefined;
    location?: { address: string } | undefined;
    profiles: Array<{ network: string; url: string }>;
  };
  work: Array<{
    name?: string | undefined;
    position?: string | undefined;
    location?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    summary?: string | undefined;
    highlights: Array<string>;
  }>;
  education: Array<{
    institution?: string | undefined;
    area?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
  }>;
  awards: Array<{
    title?: string | undefined;
    date?: string | undefined;
    awarder?: string | undefined;
    summary?: string | undefined;
  }>;
  certificates: Array<{
    name?: string | undefined;
    date?: string | undefined;
    issuer?: string | undefined;
  }>;
  publications: Array<{
    name?: string | undefined;
    publisher?: string | undefined;
    releaseDate?: string | undefined;
    summary?: string | undefined;
  }>;
  skills: Array<{ name?: string | undefined; keywords: Array<string> }>;
  languages: Array<{ language: string; fluency?: string | undefined }>;
  interests: Array<{ name: string }>;
  projects: Array<{
    name?: string | undefined;
    description?: string | undefined;
    highlights: Array<string>;
    startDate?: string | undefined;
    endDate?: string | undefined;
  }>;
  meta: { version: string };
}

export const JSON_RESUME_SCHEMA_URL =
  "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json";

/** The icons a contact might carry that name a network, read back as the name. */
const NETWORK_BY_ICON: Record<string, string> = {
  "github-logo": "GitHub",
  "linkedin-logo": "LinkedIn",
  "twitter-logo": "Twitter",
};

const orUndefined = (value: string): string | undefined =>
  value.trim() === "" ? undefined : value.trim();

/** A model range as JSON Resume's two dates. `current` is an absent end. */
const dates = (
  dateRange: DateRange | undefined,
): { startDate?: string | undefined; endDate?: string | undefined } => ({
  startDate: dateRange?.start,
  endDate: dateRange?.current === true ? undefined : dateRange?.end,
});

const entriesOf = (owner: Section): Array<EntryBlock> =>
  owner.blocks.filter((block): block is EntryBlock => block.kind === "entry");

const tagsOf = (owner: Section): Array<string> =>
  owner.blocks.flatMap((block) => (block.kind === "tagList" ? block.tags : []));

const textOf = (inline: InlineText | undefined): string | undefined =>
  inline === undefined ? undefined : orUndefined(plainText(inline));

/**
 * A document as JSON Resume.
 *
 * Only what the format has a place for. Hidden sections are not written, since
 * hiding one is how a person says it is not part of this version, and sections of
 * the `custom` kind are not written either: JSON Resume has fixed section names
 * and nothing that a free-titled section could honestly be called. The export
 * menu says so.
 */
export const toJsonResume = (document: ResumeDocument): JsonResume => {
  const { header } = document.content;
  const visible = document.content.sections.filter(
    (candidate) => candidate.hidden !== true,
  );

  const basics: JsonResume["basics"] = {
    name: textOf(header.name),
    label: textOf(header.headline),
    profiles: [],
  };

  for (const contact of header.contacts) {
    const label = plainText(contact.label).trim();
    const href = contact.href?.trim();
    const icon = contact.icon?.name;

    if (
      basics.email === undefined &&
      (href?.toLowerCase().startsWith("mailto:") === true ||
        icon === "envelope" ||
        /^[^\s@]+@[^\s@]+$/.test(label))
    ) {
      basics.email = href?.replace(/^mailto:/i, "") ?? label;
    } else if (
      basics.phone === undefined &&
      (href?.toLowerCase().startsWith("tel:") === true || icon === "phone")
    ) {
      basics.phone = label;
    } else if (icon === "map-pin") {
      basics.location ??= { address: label };
    } else if (icon !== undefined && icon in NETWORK_BY_ICON) {
      basics.profiles.push({
        network: NETWORK_BY_ICON[icon] ?? label,
        url: href ?? label,
      });
    } else if (
      basics.url === undefined &&
      (href !== undefined || icon === "globe")
    ) {
      basics.url = href ?? label;
    } else if (href !== undefined) {
      basics.profiles.push({ network: label, url: href });
    }
  }

  const result: JsonResume = {
    $schema: JSON_RESUME_SCHEMA_URL,
    basics,
    work: [],
    education: [],
    awards: [],
    certificates: [],
    publications: [],
    skills: [],
    languages: [],
    interests: [],
    projects: [],
    meta: { version: "v1.0.0" },
  };

  for (const current of visible) {
    switch (current.kind) {
      case "summary": {
        const paragraphs = current.blocks.flatMap((block) =>
          block.kind === "paragraph" ? [plainText(block.text).trim()] : [],
        );

        basics.summary = orUndefined(paragraphs.join("\n\n"));
        break;
      }

      case "experience":
        for (const item of entriesOf(current)) {
          result.work.push({
            name: textOf(item.subtitle),
            position: textOf(item.title),
            location: textOf(item.location),
            ...dates(item.dateRange),
            summary: textOf(item.summary),
            highlights: item.bullets.map((bullet) => plainText(bullet)),
          });
        }
        break;

      case "education":
        for (const item of entriesOf(current)) {
          result.education.push({
            institution: textOf(item.subtitle),
            area: textOf(item.title),
            ...dates(item.dateRange),
          });
        }
        break;

      case "projects":
        for (const item of entriesOf(current)) {
          result.projects.push({
            name: textOf(item.title),
            description: textOf(item.summary),
            highlights: item.bullets.map((bullet) => plainText(bullet)),
            ...dates(item.dateRange),
          });
        }
        break;

      case "certifications":
        for (const item of entriesOf(current)) {
          result.certificates.push({
            name: textOf(item.title),
            issuer: textOf(item.subtitle),
            date: item.dateRange?.start,
          });
        }
        break;

      case "awards":
        for (const item of entriesOf(current)) {
          result.awards.push({
            title: textOf(item.title),
            awarder: textOf(item.subtitle),
            date: item.dateRange?.start,
            summary: textOf(item.summary),
          });
        }
        break;

      case "publications":
        for (const item of entriesOf(current)) {
          result.publications.push({
            name: textOf(item.title),
            publisher: textOf(item.subtitle),
            releaseDate: item.dateRange?.start,
            summary: textOf(item.summary),
          });
        }
        break;

      case "skills": {
        // A heading names the group of the tag list that follows it, and a
        // list with no heading is named for the section.
        let name = plainText(current.title).trim();

        for (const block of current.blocks) {
          if (block.kind === "heading") {
            name = plainText(block.text).trim();
          } else if (block.kind === "tagList") {
            result.skills.push({
              name: orUndefined(name),
              keywords: block.tags,
            });
          }
        }
        break;
      }

      case "languages":
        for (const tag of tagsOf(current)) {
          // "English (Native)", the form the reader writes.
          const match = /^(.*?)\s*\((.*)\)$/.exec(tag);

          result.languages.push(
            match?.[1] === undefined || match[2] === undefined
              ? { language: tag }
              : { language: match[1], fluency: match[2] },
          );
        }
        break;

      case "interests":
        for (const tag of tagsOf(current)) {
          result.interests.push({ name: tag });
        }
        break;

      case "custom":
        break;
    }
  }

  return result;
};
