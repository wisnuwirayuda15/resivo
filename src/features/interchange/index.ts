import { documentFromMarkdown } from "@/features/markdown/index";
import { documentSchema } from "@/features/resume/model/index";
import { LocalizedError } from "@/lib/i18n/LocalizedError";

import { fromJsonResume } from "./jsonResume";
import { textToMarkdown } from "./plainText";

import type { ResumeDocument } from "@/features/resume/model/document";
import type { DroppedField } from "./jsonResume";

/**
 * Turning a file somebody chose into a document.
 *
 * One entry point for every format the new-resume dialog accepts, so the dialog
 * asks "what is this and what came of reading it" once and does not know about
 * any of them.
 */

export { toJsonResume } from "./jsonResume";
export { toPlainText } from "./plainText";
export type { DroppedField } from "./jsonResume";

export const IMPORT_FORMATS = ["markdown", "json-resume", "text"] as const;
export type ImportFormat = (typeof IMPORT_FORMATS)[number];

/**
 * What kind of file this is, from its name and its first characters.
 *
 * The extension is only a hint: a JSON file saved as `.txt` is still JSON, and a
 * `.md` with no heading in it is closer to text than to the format. Markdown is
 * recognised by what only Markdown has, a `#` heading or a `::` directive; a
 * file with neither is read as text, which accepts Markdown's bullets anyway.
 */
export const detectImportFormat = (
  filename: string,
  source: string,
): ImportFormat => {
  if (/\.json$/i.test(filename) || source.trimStart().startsWith("{")) {
    return "json-resume";
  }

  if (/^#{1,6}\s/m.test(source) || /^:{2,3}[a-z]/m.test(source)) {
    return "markdown";
  }

  return "text";
};

export interface ImportedDocument {
  format: ImportFormat;
  document: ResumeDocument;
  /** Lines the Markdown reader kept as source text. Always 0 for JSON Resume. */
  warningCount: number;
  /** Fields the file had and the document has no place for. */
  dropped: Array<DroppedField>;
  fullName: string;
}

/**
 * The document a file makes, on top of `base`.
 *
 * `base` is the empty document the dialog would otherwise have made, so the
 * template's design tokens and the language are the ones chosen there. The
 * result is checked against the document schema before it is returned, and a
 * failure is reported as a sentence rather than a stack trace: nothing is
 * written until the dialog is submitted, and a file that cannot become a valid
 * document should be refused here, where the person can choose another.
 */
export const importDocument = (
  filename: string,
  source: string,
  base: ResumeDocument,
): ImportedDocument => {
  const format = detectImportFormat(filename, source);

  let document: ResumeDocument;
  let warningCount = 0;
  let dropped: Array<DroppedField> = [];

  if (format === "json-resume") {
    let value: unknown;

    try {
      value = JSON.parse(source);
    } catch {
      throw new LocalizedError(
        "This file is not valid JSON.",
        "library:create.errors.invalidJson",
      );
    }

    ({ document, dropped } = fromJsonResume(value, base));
  } else {
    // `documentFromMarkdown`, never `applyMarkdown`: this is building a
    // document out of a file, not editing one (see CLAUDE.md).
    const parsed = documentFromMarkdown(
      base,
      format === "text" ? textToMarkdown(source) : source,
    );

    document = parsed.document;
    warningCount = parsed.warnings.length;
  }

  const checked = documentSchema.safeParse(document);

  if (!checked.success) {
    throw new LocalizedError(
      "This file could not be turned into a valid resume.",
      "library:create.errors.invalid",
      { detail: checked.error.issues[0]?.message ?? "" },
    );
  }

  return {
    format,
    document,
    warningCount,
    dropped,
    fullName: document.meta.fullName,
  };
};
