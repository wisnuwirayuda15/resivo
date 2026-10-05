import i18next from "i18next";

import { ats } from "@/locales/en/ats";

/**
 * The words of the ATS panel, from the app's own message file.
 *
 * `describeIssue` takes a translate function and nothing else from i18next, so
 * the film builds a private instance with the English namespace and reads the
 * sentences the app would show. `initAsync: false` makes `init` finish before
 * it returns, which matters because a frame is rendered the moment it is asked
 * for.
 */
const instance = i18next.createInstance();

void instance.init({
  lng: "en",
  resources: { en: { ats } },
  interpolation: { escapeValue: false },
  initAsync: false,
});

export const tAts = instance.getFixedT("en", "ats");
