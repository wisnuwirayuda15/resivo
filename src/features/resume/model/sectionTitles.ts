import type { SectionKind } from "./document";

/**
 * What a section is called when this app is the one naming it.
 *
 * These are document content, not interface text. A new resume's four sections
 * and the one "Add section" inserts become the resume's own words the moment
 * they exist, and are exported, printed and read by a parser, so they follow the
 * language of the document (`meta.locale`) and not the language the menus are
 * in. Someone running the app in English and writing an Indonesian resume wants
 * "Pengalaman" on the page.
 *
 * That is why they are not in the `locales` message tree, which is the interface
 * and changes when the interface does. A document does not change when somebody
 * switches the app's language.
 *
 * Every title here must be one `sectionKindFromTitle` maps back to its kind, or
 * the section it names would be `custom` the next time the Markdown is read, and
 * `sectionTitles.test.ts` checks that for each.
 */
const TITLES: Record<"en" | "id", Record<SectionKind, string>> = {
  en: {
    summary: "Summary",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    projects: "Projects",
    certifications: "Certifications",
    awards: "Awards",
    publications: "Publications",
    languages: "Languages",
    interests: "Interests",
    custom: "Custom section",
  },
  id: {
    summary: "Ringkasan",
    experience: "Pengalaman",
    education: "Pendidikan",
    skills: "Keahlian",
    projects: "Proyek",
    certifications: "Sertifikasi",
    awards: "Penghargaan",
    publications: "Publikasi",
    languages: "Bahasa",
    interests: "Minat",
    custom: "Bagian khusus",
  },
};

/**
 * The title for a section of this kind in a document of this language.
 *
 * Matched on the language subtag, so `id-ID` is Indonesian, and anything this
 * table does not cover is English: the title of a section in a language nobody
 * has translated is better as English than as nothing.
 */
export const sectionTitle = (kind: SectionKind, locale: string): string => {
  const language = locale.toLowerCase().split("-")[0];

  return (language === "id" ? TITLES.id : TITLES.en)[kind];
};
