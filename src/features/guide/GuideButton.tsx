import { Suspense, lazy, useState } from "react";
import { Button } from "@mantine/core";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";
import { useDisclosure } from "@mantine/hooks";

import { Icon } from "@/features/icons/IconRenderer";
import { TOUR_TARGET_IDS } from "@/features/onboarding/steps";

/**
 * The way into the guide, and the drawer it opens.
 *
 * Placed at the end of the code pane's tab strip rather than in the application
 * bar. Two reasons: it is the guide to what is typed in that pane, so it belongs
 * beside it; and the code pane exists in both editor layouts (as a pane on a
 * wide screen and as a tab on a narrow one), so one button covers both without
 * a breakpoint.
 *
 * It carries its word rather than being an icon alone. A guide nobody finds is
 * worth nothing, and "Guide" is two syllables of header space.
 *
 * The drawer is a separate chunk, following the same reasoning as Monaco: it
 * carries a syntax highlighter and two grammars, and someone who never opens the
 * guide should not download them. Mounted from the first open onwards rather
 * than only while open, so the second visit opens instantly and animates.
 */
const GuideDrawer = lazy(() =>
  import("./GuideDrawer").then((module) => ({ default: module.GuideDrawer })),
);

export const GuideButton: React.FC = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const [everOpened, setEverOpened] = useState(false);

  return (
    <>
      {/* A tour step of its own, because this is the least discoverable thing
          in the editor and the most useful once found: a format nobody can
          guess, and a prompt that hands it to an assistant. */}
      <OnboardingTour.Target id={TOUR_TARGET_IDS.guide}>
        <Button
          leftSection={<Icon name="book-open" size={13} />}
          onClick={() => {
            setEverOpened(true);
            open();
          }}
          size="compact-xs"
          variant="default"
        >
          Guide
        </Button>
      </OnboardingTour.Target>

      {everOpened ? (
        // No fallback: the chunk arrives in a frame or two, and a spinner where
        // the drawer is about to be reads as something having gone wrong.
        <Suspense fallback={null}>
          <GuideDrawer onClose={close} opened={opened} />
        </Suspense>
      ) : null}
    </>
  );
};
