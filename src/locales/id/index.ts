import { commands } from "./commands";
import { common } from "./common";
import { settings } from "./settings";
import { shell } from "./shell";

/** Bahasa Indonesia. Each namespace is checked against English where it is
 * written, and the set of namespaces is checked against English in
 * `lib/i18n/language.ts`. */
export const id = { common, shell, commands, settings };
