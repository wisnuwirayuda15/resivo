import { useState } from "react";
import { Box, Button, Menu } from "@mantine/core";

import { Icon } from "@/features/icons/IconRenderer";

import { markdownHref } from "../markdown/urls";
import { useDocsTranslation } from "../useDocsTranslation";

import type { DocsLanguage } from "../paths";

interface PageActionsProps {
  lang: DocsLanguage;
  slugs: ReadonlyArray<string>;
  title: string;
}

type CopyState = "idle" | "copied" | "failed";

/** How long the button says what happened before it goes back to its label. */
const FEEDBACK_MS = 1800;

/**
 * Puts the page's Markdown on the clipboard.
 *
 * The clipboard item is handed over as a promise of the text, not as text that
 * was awaited first: Safari ends the click's permission to write once an `await`
 * has happened, and a fetch is one. Browsers without `ClipboardItem` get the
 * plain `writeText`, which is only reached after the fetch and so can refuse
 * there, which is why a failure is a state the person is told about.
 */
const copyMarkdown = async (href: string): Promise<void> => {
  const text = fetch(href).then((response) => {
    if (!response.ok) {
      throw new Error(`Could not load ${href}`);
    }

    return response.text();
  });

  if (typeof ClipboardItem === "undefined") {
    await navigator.clipboard.writeText(await text);

    return;
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "text/plain": text.then(
        (value) => new Blob([value], { type: "text/plain" }),
      ),
    }),
  ]);
};

/**
 * What an assistant is asked when a page is opened in it. The only thing sent is
 * the address of this public page; the assistant fetches it itself, so nothing a
 * reader has written in the app, which never leaves their browser, is involved.
 */
const AssistantItems: React.FC<{
  lang: DocsLanguage;
  slugs: ReadonlyArray<string>;
}> = ({ lang, slugs }) => {
  const { t } = useDocsTranslation(lang);
  // Read when the menu opens, which only ever happens in a browser, so the
  // server never has to guess the origin.
  const url = `${window.location.origin}${markdownHref(lang, slugs)}`;
  const prompt = encodeURIComponent(t("page.assistantPrompt", { url }));

  return (
    <>
      <Menu.Item
        component="a"
        href={`https://claude.ai/new?q=${prompt}`}
        leftSection={<Icon name="sparkle" size={14} />}
        rel="noopener noreferrer"
        target="_blank"
      >
        {t("page.openClaude")}
      </Menu.Item>
      <Menu.Item
        component="a"
        href={`https://chatgpt.com/?q=${prompt}`}
        leftSection={<Icon name="sparkle" size={14} />}
        rel="noopener noreferrer"
        target="_blank"
      >
        {t("page.openChatGpt")}
      </Menu.Item>
    </>
  );
};

/**
 * The row under a page's title: copy it, read it as Markdown, or hand it to an
 * assistant.
 *
 * Copy is the one that matters. A reader who wants to ask a question about a page
 * can paste it whole, and an agent that cannot fetch can be handed it. The link
 * beside it is the same text at an address, for the reader who wants to see it
 * first or give the address to a tool.
 */
export const PageActions: React.FC<PageActionsProps> = ({ lang, slugs }) => {
  const { t } = useDocsTranslation(lang);
  const [state, setState] = useState<CopyState>("idle");
  const href = markdownHref(lang, slugs);

  const copy = () => {
    copyMarkdown(href)
      .then(
        () => setState("copied"),
        () => setState("failed"),
      )
      .finally(() => {
        setTimeout(() => setState("idle"), FEEDBACK_MS);
      });
  };

  return (
    <Box className="mt-4 flex flex-wrap gap-2">
      <Button
        color="gray"
        leftSection={
          <Icon name={state === "copied" ? "check" : "copy"} size={14} />
        }
        onClick={copy}
        size="xs"
        variant="default"
      >
        {state === "copied"
          ? t("page.copied")
          : state === "failed"
            ? t("page.copyFailed")
            : t("page.copy")}
      </Button>
      <Button
        color="gray"
        component="a"
        href={href}
        leftSection={<Icon name="markdown-logo" size={14} />}
        rel="noopener"
        size="xs"
        target="_blank"
        variant="default"
      >
        {t("page.viewMarkdown")}
      </Button>
      <Menu position="bottom-start" shadow="md" width={200}>
        <Menu.Target>
          <Button
            color="gray"
            rightSection={<Icon name="caret-down" size={12} />}
            size="xs"
            variant="default"
          >
            {t("page.askAssistant")}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <AssistantItems lang={lang} slugs={slugs} />
        </Menu.Dropdown>
      </Menu>
    </Box>
  );
};
