import { useState } from "react";
import { Box, Button, Text, Tooltip } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { Icon } from "@/features/icons/IconRenderer";
import { useEditorStore } from "@/features/editor/store";
import { useResume } from "@/features/resume/queries";
import { useTranslation } from "@/lib/i18n/useTranslation";

import { CompareDialog } from "./CompareDialog";

/**
 * Says that the open resume is a version, for which job, and offers the way back
 * to what it was made from and the comparison with it.
 *
 * Nothing at all for an ordinary resume, which is almost all of them. A version
 * whose base has been deleted keeps the chip (it is still written for that job)
 * and loses the two things that need a base to point at.
 */
export const VersionChip: React.FC<{ resumeId: string }> = ({ resumeId }) => {
  const { t } = useTranslation("editor");
  const resume = useResume(resumeId);
  const base = useResume(resume.data?.baseId);
  const current = useEditorStore((state) => state.document);
  const [comparing, setComparing] = useState(false);

  const target = resume.data?.target;
  const baseRecord = base.data ?? undefined;

  if (target === undefined) {
    return null;
  }

  return (
    <>
      <Box className="flex items-center gap-1.5">
        <Tooltip
          label={
            baseRecord === undefined
              ? t("versions.chipAria", { company: target.company })
              : t("versions.openBase", { title: baseRecord.title })
          }
        >
          {baseRecord === undefined ? (
            <Text
              className="text-accent hidden max-w-[22ch] items-center gap-1 truncate text-[12px] sm:flex"
              component="span"
            >
              <Icon name="git-branch" size={13} />
              {t("versions.chip", { company: target.company })}
            </Text>
          ) : (
            <Link
              className="text-accent hidden max-w-[22ch] items-center gap-1 truncate text-[12px] hover:underline sm:flex"
              params={{ resumeId: baseRecord.id }}
              to="/resumes/$resumeId"
            >
              <Icon name="git-branch" size={13} />
              {t("versions.chip", { company: target.company })}
            </Link>
          )}
        </Tooltip>

        {baseRecord === undefined ? null : (
          <Button
            aria-label={t("versions.compare")}
            leftSection={<Icon name="git-diff" size={14} />}
            onClick={() => setComparing(true)}
            size="compact-xs"
            variant="default"
          >
            <Text className="hidden text-[12px] sm:inline" component="span">
              {t("versions.compare")}
            </Text>
          </Button>
        )}
      </Box>

      <CompareDialog
        base={
          baseRecord === undefined
            ? undefined
            : { title: baseRecord.title, document: baseRecord.document }
        }
        current={current}
        onClose={() => setComparing(false)}
        opened={comparing}
      />
    </>
  );
};
