import { assets } from "./assets";
import { ats } from "./ats";
import { commands } from "./commands";
import { common } from "./common";
import { editor } from "./editor";
import { library } from "./library";
import { settings } from "./settings";
import { shell } from "./shell";
import { style } from "./style";
import { templates } from "./templates";

/** Bahasa Indonesia. Each namespace is checked against English where it is
 * written, and the set of namespaces is checked against English in
 * `lib/i18n/language.ts`. */
export const id = {
  common,
  shell,
  commands,
  settings,
  library,
  templates,
  editor,
  style,
  ats,
  assets,
};
