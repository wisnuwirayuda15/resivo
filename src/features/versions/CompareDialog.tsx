import { useMemo } from "react";
import { Alert, Box, Drawer, Text } from "@mantine/core";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

import { compareDocuments } from "./compare";

import type { ResumeDocument } from "@/features/resume/model/document";
import type { BlockChange, SectionChange } from "./compare";
import type { DiffPart } from "./diff";

interface CompareDialogProps {
  opened: boolean;
  onClose: () => void;
  /** The resume the version was made from, as last saved. */
  base: { title: string; document: ResumeDocument } | undefined;
  /** The version as it is now, which is the live document, so an edit that has
   * not been autosaved yet is already in the comparison. */
  current: ResumeDocument | null;
}

/**
 * Words, with the changed ones marked.
 *
 * Colour is never the only signal: an addition is underlined and a removal is
 * struck through, so the difference survives a colour-blind reader and a black
 * and white print of the drawer.
 */
const Words: React.FC<{ parts: ReadonlyArray<DiffPart> }> = ({ parts }) => (
  <>
    {parts.map((part, index) => (
      <Text
        className={cn(
          "whitespace-pre-wrap",
          part.type === "added" &&
            "bg-success-quiet text-success-text underline",
          part.type === "removed" &&
            "bg-danger-quiet text-danger-text line-through",
        )}
        component="span"
        key={index}
      >
        {part.text}
      </Text>
    ))}
  </>
);

const BlockRow: React.FC<{ change: BlockChange }> = ({ change }) => {
  const { t } = useTranslation("editor");
  const parts: ReadonlyArray<DiffPart> =
    change.words ??
    (change.status === "removed"
      ? [{ type: "removed", text: change.text }]
      : change.status === "added"
        ? [{ type: "added", text: change.text }]
        : [{ type: "same", text: change.text }]);

  return (
    <Box className="border-line-soft border-t py-2 first:border-t-0">
      <Text className="text-subtle mb-0.5 text-[11px]" component="div">
        {change.formatOnly === true
          ? t("versions.block.formatOnly")
          : t(`versions.block.${change.status}`)}
        {change.moved && change.status !== "moved"
          ? `, ${t("versions.block.moved").toLowerCase()}`
          : null}
      </Text>
      <Text className="text-[13px] leading-snug" component="div">
        <Words parts={parts} />
      </Text>
    </Box>
  );
};

const SectionCard: React.FC<{ change: SectionChange }> = ({ change }) => {
  const { t } = useTranslation("editor");
  const notes = [
    change.status === "added" ? t("versions.section.added") : null,
    change.status === "removed" ? t("versions.section.removed") : null,
    change.moved ? t("versions.section.moved") : null,
    change.visibility === undefined
      ? null
      : t(`versions.section.${change.visibility}`),
    change.renamed === undefined
      ? null
      : t("versions.section.renamed", { from: change.renamed.from }),
    change.styleChanged ? t("versions.section.style") : null,
  ].filter((note) => note !== null);

  return (
    <Box className="border-line-soft bg-surface rounded-card border px-3 py-2">
      <Text className="text-title text-[13px] font-medium" component="div">
        {change.title}
      </Text>
      {notes.length === 0 ? null : (
        <Text className="text-accent text-[11px]" component="div">
          {notes.join(" · ")}
        </Text>
      )}
      {change.blocks.length === 0 ? null : (
        <Box className="mt-1">
          {change.blocks.map((block) => (
            <BlockRow change={block} key={block.id} />
          ))}
        </Box>
      )}
    </Box>
  );
};

/**
 * What a version has changed from the resume it was made from.
 *
 * A drawer rather than a modal: it is a long list that is read beside the
 * editor, and on a narrow screen a drawer is the shape that has room for it.
 * The comparison is recomputed from the two documents whenever either changes,
 * which is cheap, and means it is never stale.
 */
export const CompareDialog: React.FC<CompareDialogProps> = ({
  opened,
  onClose,
  base,
  current,
}) => {
  const { t } = useTranslation("editor");
  const comparison = useMemo(
    () =>
      opened && base !== undefined && current !== null
        ? compareDocuments(base.document, current)
        : undefined,
    [opened, base, current],
  );

  return (
    <Drawer
      onClose={onClose}
      opened={opened}
      position="right"
      size={520}
      title={t("versions.title", { title: base?.title ?? "" })}
    >
      {comparison === undefined ? null : (
        <Box className="flex flex-col gap-3">
          <Text className="text-muted text-[13px] leading-snug">
            {t("versions.intro", { title: base?.title ?? "" })}
          </Text>

          {comparison.identical ? (
            <Text className="text-body text-[13px]">
              {t("versions.identical", { title: base?.title ?? "" })}
            </Text>
          ) : null}

          {comparison.noSharedIdentity ? (
            <Alert color="yellow" variant="light">
              {t("versions.noSharedIdentity")}
            </Alert>
          ) : null}

          {comparison.settings.length === 0 ? null : (
            <Box className="flex flex-wrap gap-1.5">
              {comparison.settings.map((setting) => (
                <Text
                  className="border-line bg-sunken text-muted rounded-control border px-2 py-0.5 text-[11px]"
                  component="span"
                  key={setting}
                >
                  {t(`versions.settings.${setting}`)}
                </Text>
              ))}
            </Box>
          )}

          {comparison.header.length === 0 ? null : (
            <Box className="border-line-soft bg-surface rounded-card border px-3 py-2">
              {comparison.header.map((change, index) => (
                <Box
                  className="border-line-soft border-t py-2 first:border-t-0"
                  key={index}
                >
                  <Text
                    className="text-subtle mb-0.5 text-[11px]"
                    component="div"
                  >
                    {t(`versions.header.${change.field}`)}
                  </Text>
                  <Text className="text-[13px]" component="div">
                    <Words parts={change.words} />
                  </Text>
                </Box>
              ))}
            </Box>
          )}

          {comparison.sections.map((section) => (
            <SectionCard change={section} key={section.id} />
          ))}

          {comparison.unchangedSections === 0 || comparison.identical ? null : (
            <Text className="text-subtle text-[12px]">
              {t("versions.unchanged", { count: comparison.unchangedSections })}
            </Text>
          )}
        </Box>
      )}
    </Drawer>
  );
};
