import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Kbd, Text, UnstyledButton } from "@mantine/core";
import { Spotlight, createSpotlight } from "@mantine/spotlight";
import { useDocsSearch } from "fumadocs-core/search/client";
import { staticClient } from "fumadocs-core/search/client/orama-static";

import { Icon } from "@/features/icons/IconRenderer";

import { isDocsLanguage, parseDocsPath, splitHash } from "../paths";
import { toViews } from "../search/results";
import { useDocsTranslation } from "../useDocsTranslation";

import type { SpotlightActionData } from "@mantine/spotlight";
import type { DocsLanguage } from "../paths";

/**
 * The docs' own search store, not the default one.
 *
 * `@mantine/spotlight` has a single global store, which the resume app's command
 * palette also uses. The two never mount together today (the docs have no
 * `Shell`), but a store of its own means that stays true if a palette is ever
 * added here, and a shortcut bound by one cannot be swallowed by the other.
 */
/** What the trigger prints. The shortcut itself is `mod + K`, which is Cmd on a
 * Mac; the hint says Ctrl because the server renders it and does not know the
 * platform, and a hint that flipped after hydration would shift the field. */
const SHORTCUT_HINT = "Ctrl K";

const [docsSearchStore, docsSearchActions] = createSpotlight();

/**
 * The field in the header that opens search.
 *
 * Looks like an input and is a button, because there is nowhere to type until
 * the dialog is open. From `sm` it carries the words and the shortcut hint; on a
 * phone it is the icon alone, which is all the room the header has.
 */
export const DocsSearchTrigger: React.FC<{ lang: DocsLanguage }> = ({
  lang,
}) => {
  const { t } = useDocsTranslation(lang);

  return (
    <UnstyledButton
      aria-label={t("search.trigger")}
      className="text-muted hover:text-body hover:bg-hover border-line-soft rounded-control duration-fast ease-standard flex h-[30px] items-center gap-2 border px-2 text-[13px] transition-colors active:scale-[0.98] sm:w-[190px]"
      onClick={() => docsSearchActions.open()}
    >
      <Icon name="magnifying-glass" size={14} />
      <Text className="hidden flex-1 text-left text-[13px] sm:block" inherit>
        {t("search.trigger")}
      </Text>
      <Kbd className="hidden sm:block" size="xs">
        {SHORTCUT_HINT}
      </Kbd>
    </UnstyledButton>
  );
};

/**
 * The search dialog.
 *
 * The engine does the ranking and returns hits as pages, headings and passages;
 * this lists them as Spotlight actions with an identity `filter`, because
 * Spotlight's own filter would match the query against each label again and drop
 * a hit whose heading did not contain the word that found it. The index is a
 * static file fetched on the first keystroke, so nothing is downloaded by a
 * reader who never searches.
 *
 * Client only: it needs a browser to fetch and to open a dialog, and the
 * layout mounts it inside `ClientOnly`.
 */
export const DocsSearchDialog: React.FC<{ lang: DocsLanguage }> = ({
  lang,
}) => {
  const { t } = useDocsTranslation(lang);
  const navigate = useNavigate();
  // One client per language: it holds the downloaded index, and a new one on
  // every render would download it again.
  const client = useMemo(
    () => staticClient({ from: `/api/search/${lang}` }),
    [lang],
  );
  const { search, setSearch, query } = useDocsSearch({ client });

  const go = (href: string) => {
    const { path, hash } = splitHash(href);
    const parsed = parseDocsPath(path);

    if (parsed === null || !isDocsLanguage(parsed.lang)) {
      return;
    }

    void navigate({
      to: "/$lang/docs/$",
      params: { lang: parsed.lang, _splat: parsed.slugs.join("/") },
      hash,
    });
  };

  const actions: Array<SpotlightActionData> = toViews(query.data).map(
    (view) => ({
      id: view.id,
      label: view.label,
      description: view.description,
      leftSection: (
        <Icon name={view.kind === "page" ? "file-text" : "text-h"} size={16} />
      ),
      onClick: () => go(view.href),
    }),
  );

  // Spotlight marks its selected action on the DOM node, and does it when the
  // query changes, which is before the hits for that query have arrived, so
  // Enter would do nothing until an arrow key was pressed. Marking the first hit
  // when the results land is what makes typing a word and pressing Enter work.
  // The marker and the index are the two things its own `selectAction` sets
  // (that function is not exported).
  const arrived = query.data;

  useEffect(() => {
    if (!Array.isArray(arrived) || arrived.length === 0) {
      return;
    }

    const list = document.getElementById(docsSearchStore.getState().listId);

    list?.querySelector("[data-selected]")?.removeAttribute("data-selected");
    list?.querySelector("[data-action]")?.setAttribute("data-selected", "true");
    docsSearchStore.updateState((state) => ({ ...state, selected: 0 }));
  }, [arrived]);

  const nothingFound =
    query.error !== undefined
      ? t("search.error")
      : search.trim() === ""
        ? t("search.hint")
        : query.isLoading
          ? null
          : t("search.nothing");

  return (
    <Spotlight
      actions={actions}
      filter={(_query, items) => items}
      highlightQuery
      nothingFound={nothingFound}
      onQueryChange={setSearch}
      query={search}
      radius="dialog"
      scrollable
      searchProps={{
        placeholder: t("search.placeholder"),
        leftSection: <Icon name="magnifying-glass" size={16} />,
      }}
      shadow="xl"
      shortcut={["mod + K", "/"]}
      store={docsSearchStore}
    />
  );
};
