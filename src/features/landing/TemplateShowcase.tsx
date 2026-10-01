import { useState } from "react";
import { Box, Text, UnstyledButton } from "@mantine/core";

import { PaperMiniature } from "@/features/templates/PaperMiniature";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { templateList } from "@/features/templates/catalog";
import { useTemplateText } from "@/features/templates/useTemplateText";

import { Reveal } from "./Reveal";

import type { TemplateId } from "@/features/resume/model/document";

/**
 * The templates, switched by the reader.
 *
 * The motion here is a state transition and nothing else: the reader points at
 * a name and the page beside it becomes that template. It is worth animating
 * because the templates differ mostly in colour and rhythm, and a hard cut
 * between two pages that are 90 percent alike reads as a flicker rather than as
 * a change.
 *
 * Every page is rendered and stacked, with opacity deciding which is on
 * top. That is not a shortcut for a keyframe: hovering across the rows is a
 * rapid, interruptible gesture, and a transition retargets from wherever it had
 * got to while a keyframe would start over on each row.
 *
 * Hover is not the only way in. Each row is a real button, so focus does the
 * same thing from the keyboard, and a tap does it on a touch screen where there
 * is no hover at all.
 */
export const TemplateShowcase: React.FC = () => {
  const [active, setActive] = useState<TemplateId>("classic");
  const text = useTemplateText();
  const { t } = useTranslation("landing");

  return (
    <Box className="bg-surface border-line-soft border-t" component="section">
      <Box className="mx-auto max-w-[1120px] px-5 py-20 sm:px-8">
        <Reveal>
          <Text
            className="text-title max-w-[28ch] text-[26px] leading-[1.15] font-semibold tracking-[-0.015em] sm:text-[30px]"
            component="h2"
          >
            {t("showcase.title")}
          </Text>
          <Text className="text-muted mt-4 max-w-[58ch] text-[14px] leading-relaxed">
            {t("showcase.body")}
          </Text>
        </Reveal>

        <Box className="mt-12 grid items-start gap-10 sm:grid-cols-12 sm:gap-8 md:gap-12">
          <Reveal className="sm:col-span-7">
            <Box className="border-line-soft border-t">
              {templateList.map((template) => {
                const selected = template.id === active;
                return (
                  <UnstyledButton
                    aria-pressed={selected}
                    className={cn(
                      "border-line-soft duration-base ease-standard block w-full border-b px-1 py-4 text-left transition-colors",
                      selected ? "bg-selected" : "hover:bg-hover",
                    )}
                    key={template.id}
                    onClick={() => setActive(template.id)}
                    onFocus={() => setActive(template.id)}
                    onPointerEnter={() => setActive(template.id)}
                  >
                    <Text
                      className={cn(
                        "duration-base ease-standard text-[15px] font-medium transition-colors",
                        selected ? "text-accent" : "text-title",
                      )}
                      component="div"
                    >
                      {text(template.id).name}
                    </Text>
                    <Text
                      className="text-muted mt-1 max-w-[52ch] text-[12.5px] leading-relaxed"
                      component="div"
                    >
                      {text(template.id).description}
                    </Text>
                  </UnstyledButton>
                );
              })}
            </Box>
          </Reveal>

          <Reveal className="sm:col-span-5" order={1}>
            <Box className="bg-sunken rounded-panel border-line-soft flex justify-center border p-6 md:p-8">
              {/* Stacked, one on top of the other. The first is in the flow so
                  the well has a height; the rest are laid over it. */}
              <Box className="relative">
                {templateList.map((template, index) => (
                  <Box
                    className={cn(
                      "duration-base ease-standard transition-opacity",
                      index === 0 ? "relative" : "absolute inset-0",
                      template.id === active ? "opacity-100" : "opacity-0",
                    )}
                    key={template.id}
                  >
                    <PaperMiniature size="hero" templateId={template.id} />
                  </Box>
                ))}
              </Box>
            </Box>
          </Reveal>
        </Box>
      </Box>
    </Box>
  );
};
