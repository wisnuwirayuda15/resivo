import type { DEFAULT_NS, RESOURCES } from "./language";

/**
 * Makes `t` know the keys.
 *
 * English is the type source, so `t("shell.sidebar.newResume")` autocompletes and
 * `t("shell.sidebar.newResum")` is a compile error. The other languages are held
 * to English's keys by `Widen`, so one source is enough.
 */
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NS;
    resources: typeof RESOURCES.en;
  }
}
