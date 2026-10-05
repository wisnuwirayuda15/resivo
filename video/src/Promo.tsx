import { MantineProvider } from "@mantine/core";
import { AbsoluteFill } from "remotion";

import { theme } from "@/styles/theme";

import { Paper } from "./components/Paper";
import { documentAfter } from "./lib/typing";

export const Promo = () => (
  <MantineProvider theme={theme} forceColorScheme="light">
    <AbsoluteFill>
      <Paper document={documentAfter(999)} scale={0.9} />
    </AbsoluteFill>
  </MantineProvider>
);
