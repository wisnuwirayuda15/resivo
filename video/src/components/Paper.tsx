import { useLayoutEffect, useRef } from "react";

import { paperMarkup } from "../lib/paper";

import type { ResumeDocument } from "@/features/resume/model/document";

/**
 * One sheet of the resume, drawn in a shadow root.
 *
 * The app puts the paper in an iframe so its cascade, its root font size and
 * its `@page` rule belong to the paper alone. A frame that has to be ready the
 * instant it is asked for cannot wait for an iframe to load, and a shadow root
 * gives the same isolation both ways: the paper's `.rp-*` rules cannot reach
 * the film, and the film's tokens cannot reach the paper. The fonts are
 * document-wide, so the faces the film loads serve the paper as well.
 *
 * The markup is written in a layout effect, before the browser paints, so the
 * frame Remotion captures already contains it.
 */
export const Paper = ({
  document,
  scale = 1,
}: {
  document: ResumeDocument;
  /** 1 is the sheet at 96 dpi: 816 by 1056 pixels for Letter. */
  scale?: number;
}) => {
  const host = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = host.current;

    if (element === null) {
      return;
    }

    const root = element.shadowRoot ?? element.attachShadow({ mode: "open" });
    const { css, html } = paperMarkup(document);

    root.innerHTML = `<style>${css}</style>${html}`;
  }, [document]);

  return (
    <div
      ref={host}
      style={{
        width: 816,
        height: 1056,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    />
  );
};
