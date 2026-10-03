import { useLocation, useNavigate } from "@tanstack/react-router";
import { Box, Menu, UnstyledButton } from "@mantine/core";

import { Icon } from "@/features/icons/IconRenderer";
import { setLanguage } from "@/lib/i18n";
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES } from "@/lib/i18n/language";

import { parseDocsPath } from "../paths";
import { useDocsTranslation } from "../useDocsTranslation";

import type { DocsLanguage } from "../paths";

/**
 * The docs' language switcher.
 *
 * Choosing a language does two things on purpose. It goes to the same page in
 * that language (slugs are identical across languages, so nothing is looked
 * up), and it stores the choice, because this is a deliberate act and the next
 * visit, the app and the docs should all agree with it. Merely opening a
 * `/id/docs` link stores nothing.
 *
 * Each language is named in itself, as in the app's own picker: someone who
 * cannot read the current language has to be able to find theirs.
 */
export const LanguageMenu: React.FC<{ lang: DocsLanguage }> = ({ lang }) => {
  const { t } = useDocsTranslation(lang);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const slugs = parseDocsPath(pathname)?.slugs ?? [];

  return (
    <Menu position="bottom-end" shadow="md" width={200}>
      <Menu.Target>
        <UnstyledButton
          aria-label={t("header.language")}
          className="text-muted hover:text-body hover:bg-hover rounded-control duration-fast ease-standard flex h-[30px] items-center gap-1.5 px-2 text-[13px] transition-colors active:scale-[0.96]"
        >
          <Icon name="translate" size={15} />
          {lang.toUpperCase()}
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        {SUPPORTED_LANGUAGES.map((option) => (
          <Menu.Item
            key={option}
            leftSection={
              option === lang ? <Icon name="check" size={14} /> : <Box w={14} />
            }
            lang={option}
            onClick={() => {
              void setLanguage(option);
              void navigate({
                to: "/$lang/docs/$",
                params: { lang: option, _splat: slugs.join("/") },
              });
            }}
          >
            {LANGUAGE_NAMES[option]}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
};
