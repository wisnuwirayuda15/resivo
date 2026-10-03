import {
  Children,
  cloneElement,
  isValidElement,
  useContext,
  useRef,
} from "react";
import { Box, Text, UnstyledButton } from "@mantine/core";
import { useClipboard } from "@mantine/hooks";

import { Icon } from "@/features/icons/IconRenderer";
import { FALLBACK_LANGUAGE } from "@/lib/i18n/language";
import { useRouteLanguage } from "@/lib/i18n/useRouteLanguage";

import { OriginContext, withOrigin } from "../origin";
import { useDocsTranslation } from "../useDocsTranslation";

interface CodeBlockProps {
  children?: React.ReactNode;
  /** Set by `rehypeHighlight`: what the fence said, or `text`. */
  "data-language"?: string;
  /** Set by `rehypeHighlight` from `title="..."` in the fence. */
  "data-title"?: string;
}

/** How a language is written in the header when the fence has no title. */
const LANGUAGE_LABELS: Record<string, string> = {
  resume: "Resivo-Markdown",
  markdown: "Markdown",
  css: "CSS",
  json: "JSON",
  bash: "Shell",
  text: "Text",
};

/** The same tree with the origin token written out in its text. The
 * highlighter leaves the token whole inside one text node, so walking the nodes
 * is enough. */
const writeOrigin = (
  node: React.ReactNode,
  origin: string | null,
): React.ReactNode =>
  Children.map(node, (child) => {
    if (typeof child === "string") {
      return withOrigin(child, origin);
    }

    return isValidElement<{ children?: React.ReactNode }>(child) &&
      child.props.children !== undefined
      ? cloneElement(
          child,
          undefined,
          writeOrigin(child.props.children, origin),
        )
      : child;
  });

/**
 * A fenced code block, drawn.
 *
 * The highlighting is already in the markup (a rehype plugin ran at compile
 * time), so this only draws the frame: a header with the file name or the
 * language, a copy button, and a body that scrolls sideways instead of pushing
 * the page.
 *
 * Copy reads the rendered text of the `pre` and not a prop, so the highlighted
 * spans are never copied as markup and the text is stored in the HTML once.
 * The copy button is the whole of "copy the AI prompt" too, because the prompts
 * are ordinary fenced blocks.
 */
export const CodeBlock: React.FC<CodeBlockProps> = ({
  children,
  "data-language": language = "text",
  "data-title": title,
}) => {
  const lang = useRouteLanguage() ?? FALLBACK_LANGUAGE;
  const { t } = useDocsTranslation(lang);
  const origin = useContext(OriginContext);
  const clipboard = useClipboard({ timeout: 1600 });
  const preRef = useRef<HTMLPreElement>(null);

  return (
    <Box className="border-line-soft bg-code rounded-panel my-5 overflow-hidden border">
      <Box className="border-line-soft flex h-9 items-center justify-between gap-3 border-b pr-1.5 pl-3">
        <Text className="text-subtle truncate font-mono text-[11px]">
          {title ?? LANGUAGE_LABELS[language] ?? language}
        </Text>
        <UnstyledButton
          aria-label={clipboard.copied ? t("code.copied") : t("code.copy")}
          className="text-subtle hover:text-body hover:bg-hover rounded-control duration-fast ease-standard flex size-7 shrink-0 items-center justify-center transition-colors active:scale-[0.92]"
          onClick={() => clipboard.copy(preRef.current?.textContent ?? "")}
        >
          <Icon
            name={clipboard.copied ? "check-circle" : "clipboard-text"}
            size={14}
          />
        </UnstyledButton>
      </Box>
      <Box
        className="m-0 overflow-x-auto p-3 text-[12.5px] leading-[1.7]"
        component="pre"
        ref={preRef}
      >
        {writeOrigin(children, origin)}
      </Box>
    </Box>
  );
};
