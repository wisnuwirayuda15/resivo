import { useState } from "react";
import {
  Box,
  Menu,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";

import { DocumentIcon, Icon } from "@/features/icons/IconRenderer";
import { IconPicker } from "@/features/icons/IconPicker";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { sectionTitle } from "@/features/resume/model/sectionTitles";
import { SECTION_KINDS } from "@/features/resume/model/document";
import { plainText, text } from "@/features/resume/model/index";
import {
  addSection,
  moveSection,
  removeSection,
  setSectionBreakBefore,
  setSectionHidden,
  setSectionIcon,
  setSectionTitle,
} from "@/features/editor/mutations";

import { HeaderPanel } from "./HeaderPanel";
import { isPlainInline } from "./plainInline";

import type { Recipe } from "@/features/editor/mutations";
import type { ResumeContent, Section } from "@/features/resume/model/document";

/**
 * The Sections tab, the document's outline, with the header above it.
 *
 * Reordering here is by explicit move, not by drag: dnd-kit and the in-preview
 * drag handles arrive with the visual editor, and this list has to be usable from
 * the keyboard regardless of whether that ever lands. When drag does arrive it
 * becomes a second way to do what these buttons already do, not a replacement,
 * both dispatch `moveSection`.
 */

interface SectionsPanelProps {
  content: ResumeContent;
  /** The document's language, which names the sections it adds. */
  locale: string;
  apply: (recipe: Recipe, options?: { coalesce?: string }) => void;
}

const SectionRow: React.FC<{
  section: Section;
  index: number;
  count: number;
  apply: SectionsPanelProps["apply"];
  onRequestRemove: () => void;
}> = ({ section, index, count, apply, onRequestRemove }) => {
  const { t } = useTranslation("style");
  const label = plainText(section.title);
  const editable = isPlainInline(section.title);
  const blocks = section.blocks.length;
  const [picking, setPicking] = useState(false);

  return (
    <li className="border-line-soft hover:bg-hover flex items-center gap-1 border-b px-2 py-1.5 last:border-b-0">
      <Box className="flex flex-none flex-col">
        <Tooltip label={t("sections.moveUp")}>
          <UnstyledButton
            aria-label={t("sections.moveNameUp", { name: label })}
            className="text-subtle hover:text-body hover:bg-active flex h-3.5 w-4 items-center justify-center rounded-[3px] disabled:opacity-30"
            disabled={index === 0}
            onClick={() => apply(moveSection(index, index - 1))}
          >
            <Icon name="caret-up" size={10} />
          </UnstyledButton>
        </Tooltip>
        <Tooltip label={t("sections.moveDown")}>
          <UnstyledButton
            aria-label={t("sections.moveNameDown", { name: label })}
            className="text-subtle hover:text-body hover:bg-active flex h-3.5 w-4 items-center justify-center rounded-[3px] disabled:opacity-30"
            disabled={index === count - 1}
            onClick={() => apply(moveSection(index, index + 1))}
          >
            <Icon name="caret-down" size={10} />
          </UnstyledButton>
        </Tooltip>
      </Box>

      <Box className="min-w-0 flex-1">
        {editable ? (
          <TextInput
            aria-label={t("sections.titleOf", { name: label })}
            onChange={(event) =>
              apply(
                setSectionTitle(section.id, text(event.currentTarget.value)),
                {
                  coalesce: `section:title:${section.id}`,
                },
              )
            }
            size="xs"
            value={label}
            variant="unstyled"
          />
        ) : (
          <Tooltip label={t("sections.formattedTitle")} multiline w={220}>
            <Text span className="text-body block truncate text-[12px]">
              {label}
            </Text>
          </Tooltip>
        )}
        <Text span className="text-subtle font-mono text-[10px] tabular-nums">
          {t("sections.blocks", { count: blocks })}
        </Text>
      </Box>

      {/* The icon is chosen here rather than in the Style tab because it belongs
          to one section, not to the document's style. Empty is the common case,
          so the button shows a dashed placeholder rather than a default glyph
          that would look chosen. */}
      <Tooltip
        label={
          section.icon === undefined
            ? t("sections.addIcon")
            : t("sections.changeIcon")
        }
      >
        <UnstyledButton
          aria-label={
            section.icon === undefined
              ? t("sections.addIconTo", { name: label })
              : t("sections.changeIconOn", { name: label })
          }
          className={cn(
            "rounded-control flex size-[22px] flex-none items-center justify-center",
            section.icon === undefined
              ? "border-line text-subtle hover:text-body hover:bg-active border border-dashed"
              : "text-accent hover:bg-active",
          )}
          onClick={() => setPicking(true)}
        >
          {section.icon === undefined ? (
            <Icon name="plus" size={10} />
          ) : (
            <DocumentIcon icon={section.icon} size={13} />
          )}
        </UnstyledButton>
      </Tooltip>

      <IconPicker
        onChange={(name, weight) =>
          apply(
            setSectionIcon(section.id, {
              library: "phosphor",
              name,
              // Only when it is not the default: the document stays free of a
              // field that says nothing, and the Markdown round trip does not
              // grow a `weight` attribute on every icon.
              ...(weight === "regular" ? {} : { weight }),
            }),
          )
        }
        onClear={() => apply(setSectionIcon(section.id, undefined))}
        onClose={() => setPicking(false)}
        opened={picking}
        value={section.icon?.name}
        weight={section.icon?.weight}
      />

      {/* A forced break belongs to one section, so it is a per-row toggle
          rather than a style token. What the document stores is the override;
          "auto" deletes it rather than writing the word. */}
      <Tooltip
        label={
          section.style?.breakBefore === "page"
            ? t("sections.startsOnNewPage")
            : t("sections.startOnNewPage")
        }
      >
        <UnstyledButton
          aria-label={
            section.style?.breakBefore === "page"
              ? t("sections.stopStarting", { name: label })
              : t("sections.startNamed", { name: label })
          }
          aria-pressed={section.style?.breakBefore === "page"}
          className={cn(
            "rounded-control flex size-[22px] flex-none items-center justify-center",
            section.style?.breakBefore === "page"
              ? "text-accent bg-selected"
              : "text-subtle hover:text-body hover:bg-active",
          )}
          onClick={() =>
            apply(
              setSectionBreakBefore(
                section.id,
                section.style?.breakBefore === "page" ? "auto" : "page",
              ),
            )
          }
        >
          <Icon name="file-plus" size={13} />
        </UnstyledButton>
      </Tooltip>

      <Tooltip
        label={
          section.hidden === true ? t("sections.show") : t("sections.hide")
        }
      >
        <UnstyledButton
          aria-label={
            section.hidden === true
              ? t("sections.showNamed", { name: label })
              : t("sections.hideNamed", { name: label })
          }
          aria-pressed={section.hidden === true}
          className={cn(
            "rounded-control flex size-[22px] flex-none items-center justify-center",
            section.hidden === true
              ? "text-accent bg-selected"
              : "text-subtle hover:text-body hover:bg-active",
          )}
          onClick={() =>
            apply(setSectionHidden(section.id, section.hidden !== true))
          }
        >
          <Icon
            name={section.hidden === true ? "eye-slash" : "eye"}
            size={13}
          />
        </UnstyledButton>
      </Tooltip>

      <Tooltip label={t("sections.deleteTooltip")}>
        <UnstyledButton
          aria-label={t("sections.deleteNamed", { name: label })}
          className="text-subtle hover:text-danger hover:bg-active rounded-control flex size-[22px] flex-none items-center justify-center"
          onClick={onRequestRemove}
        >
          <Icon name="trash" size={13} />
        </UnstyledButton>
      </Tooltip>
    </li>
  );
};

export const SectionsPanel: React.FC<SectionsPanelProps> = ({
  content,
  locale,
  apply,
}) => {
  const { t } = useTranslation("style");
  const [pendingRemoval, setPendingRemoval] = useState<Section | null>(null);
  const sections = content.sections;

  return (
    <Box>
      {/* The header first, because it is first on the paper. Its contacts are
          edited here for a structural reason, see `HeaderPanel`. */}
      <HeaderPanel apply={apply} header={content.header} />

      <ul className="list-none">
        {sections.map((section, index) => (
          <SectionRow
            apply={apply}
            count={sections.length}
            index={index}
            key={section.id}
            onRequestRemove={() => setPendingRemoval(section)}
            section={section}
          />
        ))}
      </ul>

      <Box className="px-2 py-2">
        <Menu position="bottom-start" width={200} withinPortal>
          <Menu.Target>
            <UnstyledButton className="border-line text-body hover:bg-hover rounded-control flex h-[26px] w-full items-center justify-center gap-1.5 border border-dashed text-[12px]">
              <Icon name="plus" size={12} />
              {t("sections.add")}
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            {SECTION_KINDS.map((kind) => (
              <Menu.Item
                key={kind}
                onClick={() =>
                  apply(addSection(kind, sectionTitle(kind, locale)))
                }
              >
                {t(`sections.kinds.${kind}`)}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Box>

      {/* Deleting takes its blocks with it, so it is confirmed rather than
          undo-only, undo is a keystroke away but not obvious mid-edit. Hiding
          is the reversible option, and it is one click on the same row. */}
      <ConfirmDialog
        confirmLabel={t("sections.deleteConfirm")}
        danger
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval !== null) {
            apply(removeSection(pendingRemoval.id));
          }

          setPendingRemoval(null);
        }}
        opened={pendingRemoval !== null}
        title={t("sections.deleteTitle")}
      >
        <Text className="text-body text-[13px]">
          {pendingRemoval === null
            ? null
            : t("sections.deleteBody", {
                title: plainText(pendingRemoval.title),
                count: pendingRemoval.blocks.length,
              })}
        </Text>
      </ConfirmDialog>
    </Box>
  );
};
