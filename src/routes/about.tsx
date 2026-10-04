import { Link, createFileRoute } from "@tanstack/react-router";
import { Box, Text } from "@mantine/core";

import { seo, seoLinks } from "@/lib/seo";
import { getSiteOrigin } from "@/lib/siteOriginFn";

import { Shell } from "@/components/shell/Shell";
import { Trans, useTranslation } from "@/lib/i18n/useTranslation";

/**
 * About.
 *
 * The menu item for this page sat disabled since the chrome was built, and PRD
 * 19 named the route. What it needs to say is not a marketing paragraph: a
 * local-first app has a consequence its user has to know about before they lose
 * something, so the trade-off is the page.
 *
 * Two of the paragraphs hold a link inside a sentence, so they are `Trans`: the
 * translation says where the link goes in its own word order, which a sentence
 * cut in three pieces around a link could not.
 */
const AboutRoute: React.FC = () => {
  const { t } = useTranslation("landing");

  return (
    <Shell title={t("about.title")}>
      <Box className="flex max-w-[68ch] flex-col gap-6 p-6">
        <Box>
          <Text className="text-body text-[15px] font-medium" component="h2">
            {t("about.keeps.title")}
          </Text>
          <Text className="text-muted mt-1.5 text-[13px] leading-normal">
            {t("about.keeps.body")}
          </Text>
        </Box>

        <Box>
          <Text className="text-body text-[14px] font-medium" component="h2">
            {t("about.costs.title")}
          </Text>
          <Text className="text-muted mt-1.5 text-[13px] leading-normal">
            <Trans
              components={{
                settings: (
                  <Link
                    className="text-accent hover:underline"
                    to="/settings"
                  />
                ),
              }}
              i18nKey="about.costs.body"
              t={t}
            />
          </Text>
        </Box>

        <Box>
          <Text className="text-body text-[14px] font-medium" component="h2">
            {t("about.how.title")}
          </Text>
          <Text className="text-muted mt-1.5 text-[13px] leading-normal">
            {t("about.how.body")}
          </Text>
        </Box>

        <Box>
          <Text className="text-body text-[14px] font-medium" component="h2">
            {t("about.exports.title")}
          </Text>
          <Text className="text-muted mt-1.5 text-[13px] leading-normal">
            {t("about.exports.body")}
          </Text>
        </Box>

        <Box>
          <Text className="text-body text-[14px] font-medium" component="h2">
            {t("about.ats.title")}
          </Text>
          <Text className="text-muted mt-1.5 text-[13px] leading-normal">
            <Trans
              components={{
                templates: (
                  <Link
                    className="text-accent hover:underline"
                    to="/templates"
                  />
                ),
              }}
              i18nKey="about.ats.body"
              t={t}
            />
          </Text>
        </Box>
      </Box>
    </Shell>
  );
};

export const Route = createFileRoute("/about")({
  loader: () => getSiteOrigin(),
  head: ({ loaderData: origin }) => ({
    meta: seo({
      title: "About Resivo, and what local-first costs",
      description:
        "What Resivo is, how a resume builder with no server works, and the one thing to know before you clear your browser storage.",
      origin,
      path: "/about",
    }),
    links: seoLinks({ origin: origin ?? null, path: "/about" }),
  }),
  component: AboutRoute,
});
