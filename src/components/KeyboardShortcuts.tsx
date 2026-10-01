import { Box, Kbd, Modal, Text } from "@mantine/core";
import { useOs } from "@mantine/hooks";
import { useTranslation } from "@/lib/i18n/useTranslation";

import type { TFunction } from "i18next";

/**
 * What the keyboard does.
 *
 * The menu item for this sat disabled since the chrome was built, which is the
 * worst version of a help sheet: it advertises that shortcuts exist and refuses
 * to say what they are.
 *
 * It documents what is bound and nothing else. A sheet listing shortcuts the app
 * does not have is worse than no sheet, so the three groups here are the three
 * places a keystroke means something different, and the reason it differs is
 * given, because "undo does something else in the code pane" is surprising until
 * you know the pane has its own history.
 */

interface KeyboardShortcutsProps {
  opened: boolean;
  onClose: () => void;
}

interface Shortcut {
  /** Keys, already resolved for this platform. Rendered as separate chips. */
  keys: Array<Array<string>>;
  description: string;
}

interface Group {
  title: string;
  /** Why this group's bindings differ from the ones above it. */
  note?: string;
  shortcuts: Array<Shortcut>;
}

const groups = (mod: string, t: TFunction<"shell">): Array<Group> => [
  {
    title: t("shortcuts.anywhere.title"),
    shortcuts: [
      { keys: [[mod, "K"]], description: t("shortcuts.anywhere.palette") },
      {
        keys: [[mod, "B"]],
        description: t("shortcuts.anywhere.sidebar"),
      },
      { keys: [[mod, "Z"]], description: t("shortcuts.anywhere.undo") },
      {
        keys: [
          [mod, "Shift", "Z"],
          [mod, "Y"],
        ],
        description: t("shortcuts.anywhere.redo"),
      },
    ],
  },
  {
    title: t("shortcuts.code.title"),
    note: t("shortcuts.code.note"),
    shortcuts: [
      { keys: [[mod, "Z"]], description: t("shortcuts.code.undo") },
      { keys: [[mod, "F"]], description: t("shortcuts.code.find") },
      { keys: [["F1"]], description: t("shortcuts.code.commands") },
    ],
  },
  {
    title: t("shortcuts.paper.title"),
    note: t("shortcuts.paper.note"),
    shortcuts: [
      { keys: [["Enter"]], description: t("shortcuts.paper.edit") },
      { keys: [["Enter"]], description: t("shortcuts.paper.keep") },
      { keys: [["Escape"]], description: t("shortcuts.paper.discard") },
    ],
  },
];

const Keys: React.FC<{ keys: Array<Array<string>> }> = ({ keys }) => {
  const { t } = useTranslation("shell");

  return (
    <Box className="flex flex-none items-center gap-1.5">
      {keys.map((combination, index) => (
        <Box className="flex items-center gap-1" key={combination.join("+")}>
          {index === 0 ? null : (
            <Text className="text-subtle mr-1 text-[11px]" span>
              {t("shortcuts.or")}
            </Text>
          )}
          {combination.map((key) => (
            <Kbd key={key} size="xs">
              {key}
            </Kbd>
          ))}
        </Box>
      ))}
    </Box>
  );
};

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  opened,
  onClose,
}) => {
  const { t } = useTranslation("shell");
  // The label has to name the right key or it is worse than no label.
  const mod = useOs() === "macos" ? "⌘" : "Ctrl";

  return (
    <Modal
      onClose={onClose}
      opened={opened}
      size={560}
      title={t("shortcuts.title")}
    >
      <Box className="flex flex-col gap-5">
        {groups(mod, t).map((group) => (
          <Box key={group.title}>
            <Text
              className="text-subtle text-[10px] font-medium tracking-[0.06em] uppercase"
              component="h3"
            >
              {group.title}
            </Text>

            {group.note === undefined ? null : (
              <Text className="text-muted mt-1 max-w-[58ch] text-[12px] leading-normal">
                {group.note}
              </Text>
            )}

            <Box className="mt-2 flex flex-col">
              {group.shortcuts.map((shortcut) => (
                <Box
                  className="border-line-soft flex items-center justify-between gap-4 border-b py-1.5 last:border-b-0"
                  key={`${group.title}:${shortcut.description}`}
                >
                  <Text className="text-body text-[13px]">
                    {shortcut.description}
                  </Text>
                  <Keys keys={shortcut.keys} />
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Modal>
  );
};
