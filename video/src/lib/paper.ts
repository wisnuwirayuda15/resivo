import { renderToStaticMarkup } from "react-dom/server";

import { documentFlow, flowItemClass } from "@/features/preview/flow";
import { previewStylesheet } from "@/features/preview/css";
import { renderFlow } from "@/features/preview/renderFlow";
import { resolveTemplate } from "@/features/templates/registry";

import type { ResumeDocument } from "@/features/resume/model/document";
import type { RenderContext } from "@/features/templates/renderer/types";

/**
 * The paper as markup and a stylesheet, from the app's own renderer.
 *
 * This is the body of `exportHtml` (`features/export/html.tsx`) with the
 * `<html>` shell taken off: the same flow, the same template, the same
 * `previewStylesheet`, so the film shows what the app draws and not a copy of
 * it. It is repeated here and not imported because `exportHtml` returns a whole
 * document, and the film needs the pieces to put in a shadow root. If that
 * function's recipe changes, this one follows it.
 *
 * One page only. The app breaks pages from DOM measurement, and there is
 * nothing to measure in a frame that is drawn once; the first page of the
 * example is what the film is about, and `.rp-page-body` clips the rest.
 */
export interface PaperMarkup {
  css: string;
  html: string;
}

export const paperMarkup = (document: ResumeDocument): PaperMarkup => {
  const items = documentFlow(document, {
    keepHeadingWithContent: document.design.pagination?.keepHeadingWithContent,
  });
  const template = resolveTemplate(document.templateId);

  const context: RenderContext = {
    locale: document.meta.locale,
    design: document.design,
    images: new Map(),
    mode: "print",
  };

  const contents = renderFlow(document, template, context, items)
    .map(
      ({ item, node }) =>
        `<div class="${flowItemClass(item.type)}">${renderToStaticMarkup(node)}</div>`,
    )
    .join("");

  return {
    css: previewStylesheet({
      templateId: document.templateId,
      design: document.design,
    }),
    html:
      `<div class="rp-root"><div class="rp-pages">` +
      `<div class="resivo-paper rp-page" data-template="${document.templateId}" ` +
      `data-size="${document.design.paper.size}"><div class="rp-page-body">${contents}</div></div>` +
      `</div></div>`,
  };
};
