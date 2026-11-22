// Writes tests/fixtures/wire-screens.json from the walk: `pnpm screens`. Nobody writes a screen by hand.
import { writeFileSync } from "node:fs";
import { wireScreens, wireScreensPath } from "./wire-screens.ts";

writeFileSync(wireScreensPath, await wireScreens());
