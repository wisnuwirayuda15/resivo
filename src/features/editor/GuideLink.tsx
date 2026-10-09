import { Button } from "@mantine/core";

import { docsHref } from "@/features/docs/paths";
import { Icon } from "@/features/icons/IconRenderer";
import { TOUR_TARGET_IDS } from "@/features/onboarding/steps";
import { useTranslation, useUiLanguage } from "@/lib/i18n/useTranslation";

/**
 * The way from the editor into the documentation on the format.
 *
 * It was a drawer with the format's own guide in it, and the guide now lives in
 * the docs, where it can be searched, linked to and read by an assistant. This
 * is the same button in the same place with a different destination: the page
 * that describes the file, in the language the app is in, so the link skips the
 * redirect that `/docs` would make.
 *
 * It opens a new tab and not this one. The editor holds a document and a history
 * that a navigation away would not lose (autosave sees to that) but would cost a
 * reload to get back to, and someone reading a directive wants the editor beside
 * it. `noopener` so the docs have no handle on this window.
 *
 * A `title` and not a `Tooltip`: the tour clones what it points at, so does a
 * tooltip, and the two cannot share one child.
 *
 * Placed at the end of the code pane's tab strip, as before: it is the guide to
 * what is typed in that pane, and the pane exists in both editor layouts, so one
 * button covers both without a breakpoint. It keeps its tour step, because it is
 * the least discoverable thing in the editor and the most useful once found.
 */
export const GuideLink: React.FC = () => {
  const { t } = useTranslation("editor");
  const language = useUiLanguage();

  return (
    <Button
      component="a"
      data-tour={TOUR_TARGET_IDS.guide}
      href={docsHref(language, ["format", "overview"])}
      leftSection={<Icon name="book-open" size={13} />}
      rel="noopener"
      size="compact-xs"
      target="_blank"
      title={t("code.guideHint")}
      variant="default"
    >
      {t("code.guide")}
    </Button>
  );
};
