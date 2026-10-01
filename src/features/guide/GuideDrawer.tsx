import {
  Box,
  Button,
  Code,
  CopyButton,
  Drawer,
  Tabs,
  Text,
} from "@mantine/core";
import {
  CodeHighlight,
  CodeHighlightAdapterProvider,
} from "@mantine/code-highlight";

import { Icon } from "@/features/icons/IconRenderer";
import { cn } from "@/lib/utils";
import { useTranslation, useUiLanguage } from "@/lib/i18n/useTranslation";

import {
  AI_PROMPT,
  AI_PROMPT_LETTER,
  GUIDE,
  guideMarkdown,
  guideWords,
  sectionWords,
} from "./content";
import { guideHighlighter } from "./highlighter";

import type { GuideChapter, GuideSection, GuideWords } from "./content";
import type { ReactNode } from "react";

/**
 * How to write a resume here, the Markdown, and the styling.
 *
 * A drawer rather than a fourth pane. The three panes are already at their
 * minimums on a 1200px screen, and this is something read once and then
 * referred back to, not something worked in. It slides over the inspector,
 * which is the pane it explains half of.
 *
 * The two copy buttons at the top are the point, not a convenience. Writing a
 * resume by asking a model for one is how a lot of people will actually do it,
 * and a model cannot see this panel, so the prompt states the whole format,
 * including what never to emit, and goes to the clipboard in one click. The
 * second button copies the guide itself, for pasting into a conversation that
 * has already started.
 */

interface GuideDrawerProps {
  opened: boolean;
  onClose: () => void;
}

/** Splits on `code spans` so the prose can name a directive as code. */
const CODE_SPAN = /`([^`]+)`/g;

const richText = (text: string): Array<ReactNode> => {
  const parts: Array<ReactNode> = [];
  let last = 0;

  for (const match of text.matchAll(CODE_SPAN)) {
    const at = match.index;

    if (at > last) {
      parts.push(text.slice(last, at));
    }

    parts.push(
      <Code key={at} className="text-[12px]">
        {match[1]}
      </Code>,
    );
    last = at + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts;
};

/**
 * A copy control, in the two sizes this panel needs.
 *
 * `copied` is the whole feedback: the label changes for a moment and changes
 * back. A notification for something that took one click and is visible in the
 * clipboard would be noise.
 */
const Copy: React.FC<{
  value: string;
  label: string;
  copiedLabel: string;
  icon?: string;
  primary?: boolean;
  className?: string;
}> = ({
  value,
  label,
  copiedLabel,
  icon = "copy",
  primary = false,
  className,
}) => (
  <CopyButton timeout={1600} value={value}>
    {({ copied, copy }) => (
      <Button
        className={className}
        leftSection={<Icon name={copied ? "check" : icon} size={14} />}
        onClick={copy}
        variant={primary ? "filled" : "default"}
      >
        {copied ? copiedLabel : label}
      </Button>
    )}
  </CopyButton>
);

const Snippet: React.FC<{ code: string; language: string }> = ({
  code,
  language,
}) => (
  <CodeHighlight
    className="mt-2.5 text-[12px]"
    code={code}
    language={language}
    radius="panel"
    withBorder
  />
);

const Section: React.FC<{
  chapter: GuideChapter["id"];
  section: GuideSection;
  words: GuideWords;
}> = ({ chapter, section, words }) => {
  const text = sectionWords(words, chapter, section.id);

  return (
    <Box className="border-line-soft border-b py-4 last:border-b-0">
      <Text
        className="text-title text-[13px] font-semibold"
        component="h3"
        id={`guide-${section.id}`}
      >
        {text.title}
      </Text>

      <Box className="mt-1.5 flex flex-col gap-2">
        {text.body.map((paragraph) => (
          <Text
            className="text-muted max-w-[68ch] text-[12.5px] leading-relaxed"
            key={paragraph.slice(0, 40)}
          >
            {richText(paragraph)}
          </Text>
        ))}
      </Box>

      {section.snippet === undefined ? null : (
        <Snippet
          code={section.snippet.code}
          language={section.snippet.language}
        />
      )}
    </Box>
  );
};

export const GuideDrawer: React.FC<GuideDrawerProps> = ({
  opened,
  onClose,
}) => {
  const { t } = useTranslation("guide");
  const language = useUiLanguage();
  const words = guideWords(language);

  return (
    <Drawer
      onClose={onClose}
      opened={opened}
      position="right"
      size={620}
      title={t("title")}
    >
      {/* Around the content rather than the app: the adapter carries the
        highlighter, and this drawer is the only place code is highlighted,
        so it stays inside the chunk that is only fetched when the guide is
        opened. */}
      <CodeHighlightAdapterProvider adapter={guideHighlighter}>
        <Box className="flex flex-col gap-1.5">
          <Box className="flex flex-wrap items-center gap-2">
            <Copy
              copiedLabel={t("copied")}
              icon="sparkle"
              label={t("copyPrompt")}
              primary
              value={AI_PROMPT}
            />
            <Copy
              copiedLabel={t("copied")}
              icon="envelope-simple"
              label={t("copyLetterPrompt")}
              value={AI_PROMPT_LETTER}
            />
            <Copy
              copiedLabel={t("copied")}
              icon="clipboard-text"
              label={t("copyGuide")}
              value={guideMarkdown(language)}
            />
          </Box>

          <Text className="text-subtle max-w-[68ch] text-[11.5px] leading-normal">
            {t("promptNote")}
          </Text>
        </Box>

        <Tabs className="mt-4" defaultValue={GUIDE[0]?.id}>
          <Tabs.List aria-label={t("tabs")}>
            {GUIDE.map((chapter) => (
              <Tabs.Tab key={chapter.id} value={chapter.id}>
                {words.chapters[chapter.id].title}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          {GUIDE.map((chapter) => (
            <Tabs.Panel key={chapter.id} value={chapter.id}>
              <Text
                className={cn(
                  "text-body max-w-[68ch] text-[12.5px] leading-relaxed",
                  "border-line-soft border-b pt-4 pb-4",
                )}
              >
                {words.chapters[chapter.id].intro}
              </Text>

              {chapter.sections.map((section) => (
                <Section
                  chapter={chapter.id}
                  key={section.id}
                  section={section}
                  words={words}
                />
              ))}
            </Tabs.Panel>
          ))}
        </Tabs>
      </CodeHighlightAdapterProvider>
    </Drawer>
  );
};
