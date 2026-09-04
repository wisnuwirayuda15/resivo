import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { ClassValue } from "clsx";

/**
 * Combines Tailwind class names.
 *
 * `clsx` flattens the conditionals (arrays, objects, `false`, `undefined`), so a
 * call site can pass a ternary or an optional prop without guarding it first.
 * `twMerge` then resolves conflicts by keeping the last of any two classes that
 * set the same property, which is what makes a `className` prop able to override
 * a component's own default rather than depending on stylesheet order.
 */
export const cn = (...inputs: Array<ClassValue>): string =>
  twMerge(clsx(inputs));
