import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Puts the rendered film where the app and the README serve it from.
 *
 * `public/promo/` and not `public/docs-media/`, which holds the docs' clips.
 * The poster is written by the `publish` script in `package.json` with
 * `remotion still`, so only the film itself is copied here. Run it after a
 * render: it copies what `out/` holds and does not render.
 */
const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, "..", "out", "resivo-promo.mp4");
const to = join(here, "..", "..", "public", "promo", "resivo-promo.mp4");

mkdirSync(dirname(to), { recursive: true });
cpSync(from, to);

console.log(`copied to ${to}`);
