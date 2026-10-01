import { useState } from "react";
import { Box, Button, Text } from "@mantine/core";

import { Icon } from "@/features/icons/IconRenderer";
import { useTranslation } from "@/lib/i18n/useTranslation";

import { useInstallability } from "./install";

/**
 * Installing Resivo, and whether it can be opened without a network.
 *
 * Both of these were true before this panel existed and neither was visible.
 * The only sign that the app could be installed was an icon in the address bar,
 * which is the one piece of browser chrome people have learned to ignore, and
 * nothing anywhere said the app had been cached, which for an app whose whole
 * claim is that it needs no server is the fact most worth stating.
 *
 * There is deliberately no prompt anywhere else. An install banner over the
 * library would be asking for something on the app's behalf before the user has
 * decided they want it; Settings is where somebody goes having decided.
 *
 * What the cache state means for the person reading it, not what it is, is in
 * the `settings` messages under `install.cache`, keyed by the state.
 */

export const InstallPanel: React.FC = () => {
  const { t } = useTranslation("settings");
  const { state, cache, install } = useInstallability();
  const [asking, setAsking] = useState(false);

  const ask = async () => {
    setAsking(true);

    try {
      await install();
    } finally {
      setAsking(false);
    }
  };

  return (
    <Box>
      {state === "installed" ? (
        <Box className="flex items-baseline gap-2">
          <Icon className="text-accent translate-y-0.5" name="check-circle" />
          <Text className="text-body text-[13px]">
            {t("install.installed")}
          </Text>
        </Box>
      ) : state === "available" ? (
        <Box>
          <Button
            leftSection={<Icon name="download-simple" size={15} />}
            loading={asking}
            onClick={() => void ask()}
          >
            {t("install.button")}
          </Button>
          <Text className="text-muted mt-3 max-w-[62ch] text-[13px]">
            {t("install.availableBody")}
          </Text>
        </Box>
      ) : (
        <Text className="text-muted max-w-[62ch] text-[13px]">
          {/* Stated as what has not happened rather than as a browser
              capability, because the offer depends on the browser, the
              platform, whether the page is served over HTTPS and whether it
              has been installed already, and this app cannot tell those apart
              from here. */}
          {t("install.notOffered")}
        </Text>
      )}

      <Text className="text-muted mt-3 max-w-[62ch] text-[13px]">
        {t(`install.cache.${cache}`)}
      </Text>
    </Box>
  );
};
