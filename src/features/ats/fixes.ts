import type { Recipe } from "@/features/editor/mutations";
import type { AtsIssue } from "./types";

/**
 * The issues that carry a one-click fix.
 */
export const fixableIssues = (
  issues: ReadonlyArray<AtsIssue>,
): Array<AtsIssue & { fix: NonNullable<AtsIssue["fix"]> }> =>
  issues.flatMap((issue) =>
    issue.fix === undefined ? [] : [{ ...issue, fix: issue.fix }],
  );

/**
 * Every given fix as one recipe.
 *
 * One recipe so "fix all" is one `apply` and therefore one undo, which is what
 * a button that changes five things at once owes the person who pressed it. The
 * recipes are independent of one another (each reads only its own target), so
 * the order they run in does not change the result.
 */
export const combineFixes = (
  issues: ReadonlyArray<AtsIssue>,
): Recipe | null => {
  const fixes = fixableIssues(issues).map((issue) => issue.fix.recipe);

  if (fixes.length === 0) {
    return null;
  }

  return (draft) => {
    for (const recipe of fixes) {
      recipe(draft);
    }
  };
};
