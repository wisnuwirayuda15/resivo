import type { ReactNode } from "react";

/**
 * The app's filled primary button at film scale: teal, white label, 500 weight.
 * It is drawn by hand and not with Mantine's `Button` because Mantine sizes in
 * fixed pixels (30 and 36), which is the right size on a screen and a speck in
 * a 1080p frame.
 */
export const Button = ({
  children,
  pressed = false,
}: {
  children: ReactNode;
  pressed?: boolean;
}) => (
  <span className="v-btn" data-pressed={pressed}>
    {children}
  </span>
);
