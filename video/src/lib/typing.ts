import { documentFromMarkdown } from "@/features/markdown/parse";
import { createEmptyDocument } from "@/features/resume/model/factory";
import { SAMPLE_SOURCE, createSampleDocument } from "@/features/resume/sample";

import type { ResumeDocument } from "@/features/resume/model/document";
import type { TemplateId } from "@/features/resume/model/document";

/**
 * The example resume as it is typed.
 *
 * The prefix is cut at the last complete line, because a half-typed directive
 * would parse to something the app never shows and the paper would flicker
 * through states nobody typed. Parsed with `documentFromMarkdown` against an
 * empty document and not `applyMarkdown`: this builds a document from nothing,
 * which is the difference CLAUDE.md spells out.
 */
export const SOURCE = SAMPLE_SOURCE;

export const SOURCE_LINES = SOURCE.split("\n");

const cache = new Map<string, ResumeDocument>();

/** The document after `lines` lines of the example have been typed. */
export const documentAfter = (
  lines: number,
  templateId: TemplateId = "classic",
): ResumeDocument => {
  if (lines >= SOURCE_LINES.length) {
    return createSampleDocument(templateId);
  }

  const key = `${templateId}:${lines}`;
  const hit = cache.get(key);

  if (hit !== undefined) {
    return hit;
  }

  const prefix = SOURCE_LINES.slice(0, lines).join("\n");
  const { document } = documentFromMarkdown(
    createEmptyDocument(templateId),
    prefix,
  );

  cache.set(key, document);

  return document;
};
