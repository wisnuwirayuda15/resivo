import { MantineProvider } from "@mantine/core";
import { Html5Audio, staticFile } from "remotion";

import { theme } from "@/styles/theme";

import { Backdrop } from "./components/Backdrop";
import { Shell } from "./components/Shell";
import { Ats } from "./scenes/Ats";
import { Export } from "./scenes/Export";
import { Intro } from "./scenes/Intro";
import { Outro } from "./scenes/Outro";
import { Templates } from "./scenes/Templates";
import { Themes } from "./scenes/Themes";
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
      <Shell scene="templates">
        <Templates />
      </Shell>
      <Shell scene="ats">
        <Ats />
      </Shell>
      <Shell scene="themes">
        <Themes />
      </Shell>
      <Shell scene="export">
        <Export />
      </Shell>
      <Shell scene="outro">
        <Outro />
      </Shell>
    </Backdrop>
  </MantineProvider>
);
