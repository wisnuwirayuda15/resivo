import { Link } from "@tanstack/react-router";
import { Box, Menu, Text, Tooltip, UnstyledButton } from "@mantine/core";

import { Icon } from "@/features/icons/IconRenderer";
import { PaperMiniature } from "@/features/templates/PaperMiniature";
import { RelativeTime } from "@/components/RelativeTime";
import { useTemplateText } from "@/features/templates/useTemplateText";
import { useTranslation } from "@/lib/i18n/useTranslation";

import { moveDestinations } from "../groups";

import type { GroupRecord, ResumeSummary } from "@/database/index";

interface ResumeCardProps {
  resume: ResumeSummary;
  /** How many versions were made from this resume, for the line under it. */
  versionCount: number;
  /** Every group the resume could be moved to, in the sidebar's order. */
  groups: ReadonlyArray<GroupRecord>;
  onRename: () => void;
  onDuplicate: () => void;
  onCreateVersion: () => void;
  onExportBundle: () => void;
  onMove: (groupId: string) => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

/**
 * One resume in the library.
 *
 * Media-first: a sunken well holds a paper miniature, with a metadata row
 * underneath. The miniature shows the resume's actual template colours without
 * rendering (or storing a thumbnail of) the real document.
 */
export const ResumeCard: React.FC<ResumeCardProps> = ({
  resume,
  versionCount,
  groups,
  onRename,
  onDuplicate,
  onCreateVersion,
  onExportBundle,
  onMove,
  onArchive,
  onRestore,
  onDelete,
}) => {
  const { t } = useTranslation("library");
  const templateText = useTemplateText();
  const archived = resume.archivedAt !== 0;

  const destinations = moveDestinations(
    groups,
    resume.groupId,
    t("group.ungrouped"),
  );

  return (
    // Only colour and shadow cross-fade, never layout properties, which
    // `transition-all` would also animate.
    <Box className="group border-line-soft bg-surface rounded-card hover:border-line duration-fast ease-standard relative border shadow-xs transition-[border-color,box-shadow] hover:shadow-md">
      <Link
        className="block"
        params={{ resumeId: resume.id }}
        to="/resumes/$resumeId"
      >
        <Box className="bg-sunken rounded-t-card flex justify-center px-4 pt-5 pb-4">
          <PaperMiniature size="card" templateId={resume.templateId} />
        </Box>

        <Box className="px-3.5 pt-3 pb-3.5">
          <Text
            className="text-title truncate text-[13px] font-medium"
            component="div"
          >
            {resume.title}
          </Text>
          {/* Middle dot separates metadata, per the design system. */}
          <Text
            className="text-subtle mt-1 truncate font-mono text-[11px]"
            component="div"
          >
            {t("card.edited")} <RelativeTime value={resume.updatedAt} /> ·{" "}
            {templateText(resume.templateId).name}
          </Text>
          {/* What a version is for, or how many there are of this one. Said
              under the metadata and not in place of it, so a card is still a
              card whether or not it belongs to a family. */}
          {resume.target === undefined && versionCount === 0 ? null : (
            <Text
              className="text-accent mt-1 truncate text-[11px]"
              component="div"
            >
              {resume.target === undefined
                ? t("version.count", { count: versionCount })
                : resume.target.role === ""
                  ? t("version.forCompany", { company: resume.target.company })
                  : t("version.for", {
                      company: resume.target.company,
                      role: resume.target.role,
                    })}
            </Text>
          )}
        </Box>
      </Link>

      {/* Actions sit outside the Link so they do not navigate. */}
      <Box className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Menu position="bottom-end" radius="panel" shadow="lg" width={180}>
          <Menu.Target>
            <Tooltip label={t("card.more")}>
              <UnstyledButton
                aria-label={t("card.actions", { title: resume.title })}
                className="border-line bg-surface text-muted hover:text-body rounded-control flex h-[26px] w-[26px] items-center justify-center border shadow-xs"
              >
                <Icon name="dots-three" size={15} />
              </UnstyledButton>
            </Tooltip>
          </Menu.Target>
          {/* Named. There is one of these on every card, and an unnamed menu is
              announced as just "menu", which says nothing about which resume is
              about to be archived. */}
          <Menu.Dropdown
            aria-label={t("card.actions", { title: resume.title })}
          >
            <Menu.Item
              leftSection={<Icon name="cursor-text" size={15} />}
              onClick={onRename}
            >
              {t("card.rename")}
            </Menu.Item>
            <Menu.Item
              leftSection={<Icon name="copy" size={15} />}
              onClick={onDuplicate}
            >
              {t("card.duplicate")}
            </Menu.Item>
            <Menu.Item
              leftSection={<Icon name="git-branch" size={15} />}
              onClick={onCreateVersion}
            >
              {t("version.action")}
            </Menu.Item>
            <Menu.Item
              leftSection={<Icon name="file-zip" size={15} />}
              onClick={onExportBundle}
            >
              {t("card.exportZip")}
            </Menu.Item>
            {destinations.length === 0 ? null : (
              <Menu.Sub>
                <Menu.Sub.Target>
                  <Menu.Sub.Item leftSection={<Icon name="folder" size={15} />}>
                    {t("card.moveTo")}
                  </Menu.Sub.Item>
                </Menu.Sub.Target>
                <Menu.Sub.Dropdown>
                  {destinations.map((group) => (
                    <Menu.Item key={group.id} onClick={() => onMove(group.id)}>
                      {group.name}
                    </Menu.Item>
                  ))}
                </Menu.Sub.Dropdown>
              </Menu.Sub>
            )}
            <Menu.Divider />
            {archived ? (
              <Menu.Item
                leftSection={<Icon name="arrow-counter-clockwise" size={15} />}
                onClick={onRestore}
              >
                {t("card.restore")}
              </Menu.Item>
            ) : (
              <Menu.Item
                leftSection={<Icon name="archive" size={15} />}
                onClick={onArchive}
              >
                {t("card.archive")}
              </Menu.Item>
            )}
            <Menu.Item
              c="var(--danger-text)"
              leftSection={<Icon name="trash" size={15} />}
              onClick={onDelete}
            >
              {t("card.delete")}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Box>
    </Box>
  );
};
