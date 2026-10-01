import { serializeDocument } from "@/features/markdown/index";
import { toJsonResume, toPlainText } from "@/features/interchange/index";
import {
  documentFontIds,
  documentImageIds,
} from "@/features/assets/references";

import { exportHtml } from "./html";
import { inlineBuiltinFonts, inlineFonts, inlineImages } from "./inline";

import type { ResumeDocument } from "@/features/resume/model/document";

/**
 * The export formats.
 *
 * One shape for all of them, so the menu is a list rather than a switch and a
 * new format is a new entry. PDF is deliberately *not* here: it is not a file
 * this app writes but a print the browser performs, on the same document
 * `buildExportHtml` produces below. `print.ts` says why that is the only path
 * from CSS to vector text; `ExportMenu` is where it is offered.
 *
 * What each format is good for is not here: formats are not interchangeable and
 * the difference is not obvious from the extension, so the menu says it, in the
 * `editor` namespace under `export.formats`, keyed by the format.
 */

export interface ExportContext {
  document: ResumeDocument;
  /** The resume's title, for the file name and the HTML `<title>`. */
  title: string;
  /**
   * The page breaks the preview measured, if it has. Only HTML uses them, but
   * every adapter receives the same context so the caller has nothing to decide.
   */
  pages?: ReadonlyArray<ReadonlyArray<string>>;
}

export interface ExportAdapter {
  format: "html" | "markdown" | "json-resume" | "text";
  label: string;
  mimeType: string;
  extension: string;
  run: (context: ExportContext) => Promise<Blob>;
}

/**
 * The self-contained document, as text.
 *
 * Exported because two destinations want the same bytes: the HTML file below,
 * and the print that produces a PDF. Building it once is what makes "the PDF is
 * the HTML export is the preview" one claim rather than three that have to be
 * kept in step.
 *
 * Assets are read and inlined here rather than in `exportHtml`, which is pure
 * and synchronous. That split is what lets the HTML writer be tested without a
 * database.
 */
export const buildExportHtml = async ({
  document,
  title,
  pages,
}: ExportContext): Promise<string> => {
  const [images, fonts, builtinFontCss] = await Promise.all([
    inlineImages(documentImageIds(document)),
    inlineFonts(documentFontIds(document)),
    inlineBuiltinFonts(),
  ]);

  return exportHtml({ document, title, images, fonts, builtinFontCss, pages });
};

const htmlAdapter: ExportAdapter = {
  format: "html",
  label: "HTML",
  mimeType: "text/html;charset=utf-8",
  extension: "html",
  run: async (context) =>
    new Blob([await buildExportHtml(context)], {
      type: "text/html;charset=utf-8",
    }),
};

const markdownAdapter: ExportAdapter = {
  format: "markdown",
  label: "Markdown",
  mimeType: "text/markdown;charset=utf-8",
  extension: "md",
  /**
   * The editor's own serializer, not a second one written for export. A separate
   * writer would be a second thing that could disagree with the parser, and the
   * whole value of this format is that it reads back in.
   */
  run: ({ document }) =>
    Promise.resolve(
      new Blob([serializeDocument(document)], {
        type: "text/markdown;charset=utf-8",
      }),
    ),
};

const jsonResumeAdapter: ExportAdapter = {
  format: "json-resume",
  label: "JSON Resume",
  mimeType: "application/json;charset=utf-8",
  extension: "json",
  /**
   * The content in the format other tools read, not a dump of this app's own
   * document: that one is the backup's business, and carries ids and style
   * tokens that mean nothing anywhere else.
   */
  run: ({ document }) =>
    Promise.resolve(
      new Blob(
        [
          `${JSON.stringify(toJsonResume(document), null, 2)}
`,
        ],
        {
          type: "application/json;charset=utf-8",
        },
      ),
    ),
};

const textAdapter: ExportAdapter = {
  format: "text",
  label: "Plain text",
  mimeType: "text/plain;charset=utf-8",
  extension: "txt",
  run: ({ document }) =>
    Promise.resolve(
      new Blob([toPlainText(document)], { type: "text/plain;charset=utf-8" }),
    ),
};

export const exportAdapters: Array<ExportAdapter> = [
  htmlAdapter,
  markdownAdapter,
  jsonResumeAdapter,
  textAdapter,
];
