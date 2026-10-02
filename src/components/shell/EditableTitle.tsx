import { useRef, useState } from "react";
import { Box, Text, TextInput } from "@mantine/core";

import { useTranslation } from "@/lib/i18n/useTranslation";

interface EditableTitleProps {
  title: string;
  /** Called with the trimmed new title, and only when it actually differs. */
  onChange: (title: string) => void;
}

/**
 * The page title, as a field.
 *
 * It is always an input rather than text that swaps for one on click: the swap
 * moves the caret's target out from under the pointer and re-lays the header,
 * and an input styled as the heading looks the same at rest and needs neither.
 * Hover and focus give it a surface, which is the only thing saying it can be
 * edited.
 *
 * The field is sized by a hidden copy of its own text laid out in the same grid
 * cell, because an `input` has no width of its own to follow what is typed
 * (`field-sizing` would do it, and is not in Firefox). The copy truncates, so a
 * long title stops at the bar's flex limit and the input ellipsizes inside it.
 *
 * A draft is held only while the field is being edited, and the shown value
 * falls back to the prop otherwise, so a rename from elsewhere (or the write
 * landing) is never fought by stale local state. Committing happens in one
 * place, blur: Enter blurs, and Escape blurs after marking the edit abandoned.
 * An empty title is abandoned too, for the same reason the rename dialog
 * refuses it: a resume with no name cannot be found in the library.
 */
export const EditableTitle: React.FC<EditableTitleProps> = ({
  title,
  onChange,
}) => {
  const { t } = useTranslation("shell");
  const [draft, setDraft] = useState<string | null>(null);
  const abandoned = useRef(false);
  const shown = draft ?? title;

  const commit = () => {
    const next = shown.trim();
    const wasAbandoned = abandoned.current;

    abandoned.current = false;
    setDraft(null);

    if (!wasAbandoned && next !== "" && next !== title) {
      onChange(next);
    }
  };

  return (
    <Text
      className="text-title min-w-0 text-[14px] leading-none font-semibold"
      component="h1"
    >
      <Box className="relative grid h-[30px] min-w-0 items-center">
        <Text
          aria-hidden
          className="invisible overflow-hidden px-2 whitespace-pre"
          component="span"
          inherit
        >
          {shown === "" ? " " : shown}
        </Text>
        <TextInput
          aria-label={t("appBar.editTitle")}
          classNames={{
            root: "absolute inset-0",
            wrapper: "h-full",
            input:
              "rounded-control hover:bg-hover focus:bg-hover focus:outline-line-accent duration-fast ease-standard h-full min-h-0 border-0 px-2 text-[length:inherit] font-[inherit] text-ellipsis transition-colors focus:outline",
          }}
          maxLength={120}
          onBlur={commit}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              abandoned.current = true;
              event.currentTarget.blur();
            }
          }}
          value={shown}
          variant="unstyled"
        />
      </Box>
    </Text>
  );
};
