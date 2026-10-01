import { ruleName } from "./types";

import type { TFunction } from "i18next";
import type { AtsIssue } from "./types";

/**
 * An issue's words, in the interface language.
 *
 * `checkDocument` is a pure function of the document with no language in it, and
 * its issues carry a rule and parameters. This is where those become sentences,
 * at the moment they are shown, so a language change re-words the list without
 * checking the document again.
 *
 * The one cast is the price of keeping the rules' own types honest. The tree is
 * checked against `ATS_RULE_NAMES` where it is written, and an issue can only be
 * built for a rule on that list, but which of a rule's variants exists (a
 * `message_heading`, a `where_body`) depends on its `context`, a runtime value
 * the type system cannot follow. The parity test in `i18n.test.ts` is what
 * stands behind it: every key exists in both languages.
 */

export interface IssueText {
  message: string;
  why: string;
  where: string;
  /** The button's label, for a rule that can repair itself. */
  fix: string | undefined;
}

export const describeIssue = (
  t: TFunction<"ats">,
  issue: AtsIssue,
): IssueText => {
  const name = ruleName(issue.rule);
  const lookup = t as unknown as (
    key: string,
    options?: Record<string, string | number>,
  ) => string;

  // The checker has no language, so a section or an entry with no title arrives
  // as an empty string and is named here.
  const params = {
    ...issue.params,
    ...(issue.params["section"] === ""
      ? { section: t("tab.untitledSection") }
      : {}),
    ...(issue.params["entry"] === "" ? { entry: t("tab.untitledEntry") } : {}),
  };

  return {
    message: lookup(`rules.${name}.message`, params),
    why: lookup(`rules.${name}.why`, params),
    where: lookup(`rules.${name}.where`, params),
    fix:
      issue.fix === undefined ? undefined : lookup(`rules.${name}.fix`, params),
  };
};
