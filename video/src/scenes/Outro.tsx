import { useCurrentFrame } from "remotion";

import { Logo } from "../components/Logo";
import { lerp, progress, STANDARD } from "../lib/motion";
import { sceneLength } from "../timeline";

/**
 * Bars 14 and 15. The wordmark is drawn, the claim the whole product rests on
 * is said in the voice of the landing page (plain, and with its cost stated),
 * the address lands in a pill, and the picture fades out under the last of the
 * sound.
 */
const LINE_ONE = 70;
const LINE_TWO = 96;
const ADDRESS = 120;

export const Outro = () => {
  const frame = useCurrentFrame();
  const length = sceneLength("outro");
  const leave = progress(frame, length - 52, 44, STANDARD);
  const appear = (from: number) => progress(frame, from, 22);

  return (
    <div className="v-stage v-outro" style={{ opacity: 1 - leave }}>
      <Logo frame={frame} from={4} />
      <div
        className="v-claim"
        style={{
          opacity: appear(LINE_ONE),
          transform: `translateY(${lerp(18, 0, appear(LINE_ONE))}px)`,
        }}
      >
        Your resume never leaves this browser.
      </div>
      <div
        className="v-subclaim"
        style={{
          opacity: appear(LINE_TWO),
          transform: `translateY(${lerp(18, 0, appear(LINE_TWO))}px)`,
        }}
      >
        No account. No server. No copy anywhere else.
      </div>
      <div
        className="v-address"
        style={{
          opacity: appear(ADDRESS),
          transform: `translateY(${lerp(18, 0, appear(ADDRESS))}px)`,
        }}
      >
        <span className="v-address-dot" />
        resivo-cv.vercel.app
      </div>
    </div>
  );
};
