import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Box, Button, Menu, Select, TextInput } from "@mantine/core";
import { z } from "zod";

import { useTranslation } from "@/lib/i18n/useTranslation";

import { seo } from "@/lib/seo";

import { Shell } from "@/components/shell/Shell";
import { ClientOnly } from "@/components/client-only";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/features/icons/IconRenderer";
import { NewResumeDialog } from "@/features/resume/components/NewResumeDialog";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";
import { TOUR_TARGET_IDS } from "@/features/onboarding/steps";
import { ResumeLibrary } from "@/features/resume/components/ResumeLibrary";
import { useGroups, useResumes } from "@/features/resume/queries";

import type { SortKey } from "@/features/resume/components/ResumeLibrary";

/**
 * Filter state lives in the URL, not in a store: it makes a filtered view
 * linkable and survives a reload, and the sidebar's group rows are then plain
 * links rather than buttons that mutate hidden state.
 */
const searchSchema = z.object({
  group: z.string().optional(),
  /** Only letters. A resume view is the library without this, and not a second
   * value, so the address of "everything" stays what it was. */
  kind: z.enum(["coverLetter"]).optional(),
  q: z.string().optional(),
  sort: z.enum(["edited", "created", "title"]).default("edited"),
});

/**
 * The sort options, once.
 *
 * Two controls offer them (a select where the row has room and a menu where it
 * does not), and a list that lived in only one of them would be a list that
 * could differ between widths. The labels are message keys, said in the
 * interface language where they are drawn.
 */
const SORT_OPTIONS = [
  { value: "edited", labelKey: "sort.edited" },
  { value: "created", labelKey: "sort.created" },
  { value: "title", labelKey: "sort.name" },
] as const satisfies ReadonlyArray<{ value: SortKey; labelKey: string }>;

const LibraryRoute: React.FC = () => {
  const { t } = useTranslation("library");
  const { group, kind, q, sort } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [newResumeOpen, setNewResumeOpen] = useState(false);

  const resumes = useResumes();
  const groups = useGroups();

  const groupName =
    group === undefined
      ? undefined
      : (groups.data?.find((candidate) => candidate.id === group)?.name ??
        t("group.ungrouped"));

  const inGroup =
    group === undefined
      ? resumes.data
      : resumes.data?.filter((resume) => resume.groupId === group);
  const visible =
    kind === undefined
      ? inGroup
      : inGroup?.filter((resume) => resume.kind === kind);

  const setSearch = (patch: { q?: string | undefined; sort?: SortKey }) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch }),
      replace: true,
    });

  return (
    <Shell
      title={
        kind === "coverLetter"
          ? t("title.letters")
          : (groupName ?? t("title.all"))
      }
      activeGroupId={group}
      activeKind={kind}
      allActive={group === undefined && kind === undefined}
      actions={
        <>
          {/* Flexible below `sm`, where 200px of search would leave the title
              nothing. It shrinks rather than disappearing: finding a resume is
              the reason this row exists. */}
          <TextInput
            className="w-[126px] sm:w-[200px]"
            placeholder={t("search.placeholder")}
            aria-label={t("search.label")}
            leftSection={<Icon name="magnifying-glass" size={15} />}
            value={q ?? ""}
            onChange={(event) =>
              setSearch({
                q:
                  event.currentTarget.value === ""
                    ? undefined
                    : event.currentTarget.value,
              })
            }
          />
          {/* The same three options, in the shape each width has room for.

              A 132px select where the row can afford one, and a menu behind a
              24px glyph where it cannot, rather than no sorting at all on a
              phone, which is what hiding it amounted to. Two controls rather
              than one because `visibleFrom` is pure CSS and needs no media
              query in a header the server renders; only one of them is ever
              displayed. */}
          <Select
            visibleFrom="sm"
            w={132}
            aria-label={t("sort.label")}
            data={SORT_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.labelKey),
            }))}
            value={sort}
            onChange={(value) => setSearch({ sort: value ?? "edited" })}
            allowDeselect={false}
          />

          <Box hiddenFrom="sm">
            <Menu position="bottom-end" radius="panel" shadow="lg" width={180}>
              <Menu.Target>
                <Button
                  aria-label={t("sort.label")}
                  className="w-[30px] px-0"
                  variant="default"
                >
                  <Icon name="arrows-down-up" size={15} />
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{t("sort.by")}</Menu.Label>
                {SORT_OPTIONS.map((option) => (
                  <Menu.Item
                    key={option.value}
                    leftSection={
                      <Icon
                        name={option.value === sort ? "check" : "dot-outline"}
                        size={15}
                      />
                    }
                    onClick={() => setSearch({ sort: option.value })}
                  >
                    {t(option.labelKey)}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </Box>
          {/* The header's button, not the sidebar's or the empty state's: it
              is the one that is on screen whatever the library holds. */}
          <OnboardingTour.Target id={TOUR_TARGET_IDS.newResume}>
            {/* The glyph alone on a phone, and centred in its own square.

                The icon is a child rather than a `leftSection`, because a
                section keeps its trailing margin once the label beside it is
                hidden, which left the plus a few pixels left of centre and
                looking out of line with everything else in the row.
                `aria-label` is what keeps the button named either way. */}
            <Button
              aria-label={t("newResume")}
              className="max-sm:w-[30px] max-sm:px-0"
              onClick={() => setNewResumeOpen(true)}
            >
              <Icon name="plus" size={15} />
              <Box className="ms-1.5 hidden sm:inline" component="span">
                {t("newResume")}
              </Box>
            </Button>
          </OnboardingTour.Target>
        </>
      }
    >
      <ClientOnly>
        <ResumeLibrary
          resumes={visible}
          isLoading={resumes.isLoading}
          query={q ?? ""}
          sort={sort}
          emptyState={
            <EmptyState
              icon="file-text"
              title={
                group === undefined
                  ? t("empty.none")
                  : t("empty.group", { group: groupName ?? group })
              }
              body={
                group === undefined ? t("empty.noneBody") : t("empty.groupBody")
              }
              action={
                <Button
                  leftSection={<Icon name="plus" size={15} />}
                  onClick={() => setNewResumeOpen(true)}
                >
                  {t("newResume")}
                </Button>
              }
            />
          }
        />

        <NewResumeDialog
          opened={newResumeOpen}
          onClose={() => setNewResumeOpen(false)}
          {...(group === undefined ? {} : { defaultGroupId: group })}
          {...(kind === undefined ? {} : { defaultKind: kind })}
          onCreated={(resumeId) =>
            navigate({ to: "/resumes/$resumeId", params: { resumeId } })
          }
        />
      </ClientOnly>
    </Shell>
  );
};

export const Route = createFileRoute("/resumes/")({
  head: () => ({
    meta: seo({
      title: "Your resumes | Resivo",
      indexable: false,
    }),
  }),
  validateSearch: searchSchema,
  component: LibraryRoute,
});
