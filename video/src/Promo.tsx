import { MantineProvider } from "@mantine/core";
import { Html5Audio, staticFile } from "remotion";

import { theme } from "@/styles/theme";

import { Backdrop } from "./components/Backdrop";
import { Shell } from "./components/Shell";
import { Intro } from "./scenes/Intro";
import { Write } from "./scenes/Write";

export const Promo = () => (
  <MantineProvider theme={theme} forceColorScheme="light">
    <Backdrop>
      <Html5Audio src={staticFile("soundtrack.wav")} />
      <Shell scene="intro">
        <Intro />
      </Shell>
      <Shell scene="write">
        <Write />
      </Shell>
    </Backdrop>
  </MantineProvider>
);
