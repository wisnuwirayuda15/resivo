import type { ReactNode } from "react";

/**
 * A pane of the app, drawn the way the app draws one: a flat surface with a
 * hairline border, a title strip, and the dialog shadow lifting it off the
 * backdrop (a film needs the depth the app gets from its layout).
 */
export const Window = ({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={`v-window ${className}`}>
    <div className="v-window-bar">
      <span className="v-window-title">{title}</span>
    </div>
    <div className="v-window-body">{children}</div>
  </div>
);
