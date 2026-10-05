import {
  BracketsCurly,
  FileHtml,
  FileMd,
  FilePdf,
  FileText,
  FileZip,
} from "@phosphor-icons/react";
import { useCurrentFrame } from "remotion";

import { GRAVITY, landing, lerp, progress } from "../lib/motion";
import timeline from "../timeline.json";

import type { ReactNode } from "react";

/**
 * Bars 11 and 12. The six ways out fall into a grid, one on each beat after the
 * first, and rest where a file would: the same fall as the opening scene's
 * syntax, so the film's two lists are made the same way.
 */
const { chips } = timeline.scenes.export.events;

const ICON = 64;

/** The formats as the export menu names them, with the file each one writes. */
const FORMATS: ReadonlyArray<{
  label: string;
  file: string;
  icon: ReactNode;
}> = [
  {
    label: "PDF",
    file: ".pdf",
    icon: <FilePdf size={ICON} weight="duotone" />,
  },
  {
    label: "HTML",
    file: ".html",
    icon: <FileHtml size={ICON} weight="duotone" />,
  },
  {
    label: "Markdown",
    file: ".md",
    icon: <FileMd size={ICON} weight="duotone" />,
  },
  {
    label: "JSON Resume",
    file: ".json",
    icon: <BracketsCurly size={ICON} weight="duotone" />,
  },
  {
    label: "Plain text",
    file: ".txt",
    icon: <FileText size={ICON} weight="duotone" />,
  },
  {
    label: "Bundle",
    file: ".zip",
    icon: <FileZip size={ICON} weight="duotone" />,
  },
];

const COLUMN = 520;
const ROW = 220;
const FALL = 18;
const DROP = 520;

export const Export = () => {
  const frame = useCurrentFrame();
  const rise = progress(frame, 0, 24);

  return (
    <div className="v-stage v-export">
      <h2
        className="v-title"
        style={{
          opacity: rise,
          transform: `translateY(${lerp(20, 0, rise)}px)`,
        }}
      >
        Export <span className="v-accent">anywhere.</span>
      </h2>
      <div className="v-files">
        {FORMATS.map((format, index) => {
          const land = chips[index] ?? 0;
          const start = land - FALL;
          const fall = progress(frame, start, FALL, GRAVITY);
          const column = (index % 3) - 1;
          const row = Math.floor(index / 3);
          const tilt = [-1.5, 1, -0.8, 1.2, -1, 1.5][index] ?? 0;

          return (
            <div
              key={format.label}
              className="v-file"
              style={{
                opacity: progress(frame, start, 6),
                transform: `translate(calc(-50% + ${column * COLUMN}px), calc(-50% + ${lerp(
                  row * ROW - DROP,
                  row * ROW,
                  fall,
                )}px)) rotate(${lerp(tilt * 4, tilt, fall)}deg) scale(${landing(frame, land)})`,
              }}
            >
              <span className="v-file-icon">{format.icon}</span>
              <span className="v-file-text">
                <span className="v-file-label">{format.label}</span>
                <span className="v-file-name">{format.file}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
