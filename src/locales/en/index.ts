import { commands } from "./commands";
import { common } from "./common";
import { library } from "./library";
import { settings } from "./settings";
import { shell } from "./shell";
import { templates } from "./templates";

/**
 * English, the source of truth for the message types.
 *
 * Each namespace is its own file, as in the reference project, so a change to
 * one screen's words is a change to one small file. The namespaces here are
 * what `NAMESPACES` in `lib/i18n/language.ts` is derived from.
 */
export const en = {
  common,
  shell,
  commands,
  settings,
  library,
  templates,
} as const;
