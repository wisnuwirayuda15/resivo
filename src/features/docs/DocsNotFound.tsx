import { useNavigate } from "@tanstack/react-router";
import { Box, Button } from "@mantine/core";

import { EmptyState } from "@/components/EmptyState";
import { FALLBACK_LANGUAGE } from "@/lib/i18n/language";
import { useRouteLanguage } from "@/lib/i18n/useRouteLanguage";

import { useDocsTranslation } from "./useDocsTranslation";

/**
 * A docs address with nothing behind it: an unknown page, or a language the docs
 * are not written in. Says so in the language of the URL where it has one, and
 * in English where it does not (an unsupported `/xx/docs` names no language).
 *
 * `navigate` and not a `Link`, because the params of a typed route do not infer
 * through Mantine's polymorphic `component` prop.
 */
export const DocsNotFound: React.FC = () => {
  const lang = useRouteLanguage() ?? FALLBACK_LANGUAGE;
  const { t } = useDocsTranslation(lang);
  const navigate = useNavigate();

  return (
    <Box className="bg-app min-h-dvh">
      <EmptyState
        icon="file-text"
        title={t("notFound.title")}
        body={t("notFound.body")}
        action={
          <Button
            onClick={() =>
              void navigate({
                to: "/$lang/docs/$",
                params: { lang, _splat: "" },
              })
            }
          >
            {t("notFound.home")}
          </Button>
        }
      />
    </Box>
  );
};
