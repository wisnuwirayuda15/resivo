import { SECTION_KINDS } from "@/features/resume/model/document";

import type { SectionKind } from "@/features/resume/model/document";

/**
 * Resivo-Markdown, the shared vocabulary of the codec.
 *
 * The format is a small, deliberately boring subset of CommonMark plus
 * directives (`remark-directive`), because a resume has structure that headings
 * and lists cannot express. An entry has a title, an employer, a location and a
 * date range; recovering those from `### Role, Employer, London (2021-2024)`
 * means guessing at punctuation, and guessing is what makes a round trip lossy.
 *
 * The three directive forms, as `remark-directive` defines them:
 *
 *   :name[text]{attrs}      inline, inside a paragraph
 *   ::name[text]{attrs}     block, on its own line
 *   :::name{attrs} … :::    block, with content inside
 *
 * What this file holds is only the names and the mapping tables. The reading and
 * writing live in `parse.ts` and `serialize.ts`, which are separate because the
 * write side is a hand-rolled serializer rather than `remark-stringify`: the
 * output has to be byte-stable across saves, and a general-purpose stringifier
 * makes formatting choices this format should not inherit.
 */

/** Container directive: one structured entry. */
export const ENTRY_DIRECTIVE = "entry";

/** Leaf directives, block level, one line each. */
export const CONTACT_DIRECTIVE = "contact";
export const TAGS_DIRECTIVE = "tags";
export const LABEL_DIRECTIVE = "label";
export const IMAGE_DIRECTIVE = "image";
export const PAGE_BREAK_DIRECTIVE = "pagebreak";

/** Text directive: an icon inside a run of text. */
export const ICON_DIRECTIVE = "icon";

/** How a tag list is written and read back. A comma is what a reader would type
 * for a list of skills, so it is what the format uses. */
export const TAG_SEPARATOR = ", ";

/**
 * Heading text to section kind.
 *
 * Only consulted when there is no previous document to match against, that is,
 * on a first parse or an import. While editing, a section keeps the kind it
 * already had even if its heading is renamed, because the heading is a label and
 * the kind is what templates key off.
 *
 * Deliberately not fuzzy. A heading this table does not know becomes a `custom`
 * section, which renders identically; guessing wrong would silently change how a
 * template lays the section out.
 */
const SECTION_SYNONYMS: Record<string, SectionKind> = {
  summary: "summary",
  about: "summary",
  profile: "summary",
  objective: "summary",
  experience: "experience",
  "work experience": "experience",
  "professional experience": "experience",
  employment: "experience",
  "work history": "experience",
  education: "education",
  skills: "skills",
  "technical skills": "skills",
  projects: "projects",
  certifications: "certifications",
  certificates: "certifications",
  awards: "awards",
  honours: "awards",
  honors: "awards",
  publications: "publications",
  languages: "languages",
  interests: "interests",
  hobbies: "interests",

  // Indonesian, the one other language the app writes section titles in (see
  // `resume/model/sectionTitles.ts`). Added here so a resume written in it is
  // read as the same kinds, which is what a template lays a section out by and
  // what the ATS check reads a heading as.
  ringkasan: "summary",
  "ringkasan profil": "summary",
  profil: "summary",
  "tentang saya": "summary",
  tujuan: "summary",
  pengalaman: "experience",
  "pengalaman kerja": "experience",
  "pengalaman profesional": "experience",
  "riwayat pekerjaan": "experience",
  pendidikan: "education",
  "riwayat pendidikan": "education",
  keahlian: "skills",
  keterampilan: "skills",
  "keahlian teknis": "skills",
  proyek: "projects",
  sertifikasi: "certifications",
  sertifikat: "certifications",
  penghargaan: "awards",
  publikasi: "publications",
  bahasa: "languages",
  minat: "interests",
  hobi: "interests",
};

export const sectionKindFromTitle = (title: string): SectionKind => {
  const normalized = title.trim().toLowerCase();
  const matched = SECTION_SYNONYMS[normalized];

  if (matched !== undefined) {
    return matched;
  }

  // A heading that is exactly a kind's own name still matches, so a kind added
  // to the model later needs no entry in the table above.
  return SECTION_KINDS.includes(normalized as SectionKind)
    ? (normalized as SectionKind)
    : "custom";
};
