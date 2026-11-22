// The terminal's frames, frozen: for every golden and hand-built screen, at every size, a hash of the bytes the cell
// painter writes in the three themes. Run once, as `pnpm frames`, by the untouched painter; never again after that.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Value } from "@sinclair/typebox/value";
import { bytesOf } from "../../src/doors/terminal/cells.ts";
import { paint } from "../../src/doors/terminal/paint.ts";
import { field } from "../../src/fields/json-values.ts";
import type { Screen } from "../../src/surface/contract/contract.ts";
import { WireScreen } from "../../src/surface/contract/wire.ts";
import { paintedScreens } from "./painted-screens.ts";
import { root } from "./sources.ts";

export const framesPath = join(root, "tests/fixtures/terminal-frames.json");
const sizes = [
  [39, 16],
  [40, 16],
  [59, 20],
  [80, 16],
  [70, 44],
  [100, 30],
  [106, 30],
  [200, 60],
] as const;
const themes = ["dark", "light", "contrast"] as const;
type Named = Readonly<{ name: string; screen: Screen }>;

/** Every screen of the golden fixture, checked against the wire shape: one that is not a screen stops the frames. */
export function goldenScreens(): readonly Named[] {
  const fixture: unknown = JSON.parse(readFileSync(join(root, "tests/fixtures/wire-screens.json"), "utf8"));
  const screens = field(fixture, "screens");
  if (!Array.isArray(screens)) throw new Error("tests/fixtures/wire-screens.json holds no screens");
  return screens.map((entry: unknown, i) => {
    const screen = field(entry, "screen");
    if (!Value.Check(WireScreen, screen)) throw new Error(`tests/fixtures/wire-screens.json: entry ${i} is no screen`);
    return { name: `wire ${i}`, screen };
  });
}
/** The first 16 hex of the sha256 of the bytes of one frame in the three themes, one after the other. */
const hashOf = (screen: Screen, cols: number, rows: number): string => {
  const grid = paint(screen, { cols, rows });
  const bytes = themes.map(theme => bytesOf(grid, undefined, theme)).join("");
  return createHash("sha256").update(bytes).digest("hex").slice(0, 16);
};
/** One line per screen: its name, then its hash at each size. */
export function framesOf(screens: readonly Named[]): string {
  const lines = screens.map(({ name, screen }) =>
    JSON.stringify([name, ...sizes.map(([cols, rows]) => hashOf(screen, cols, rows))]),
  );
  const named = JSON.stringify(sizes.map(([cols, rows]) => `${cols}x${rows}`));
  return `{ "v": 1, "sizes": ${named}, "screens": [\n${lines.join(",\n")}\n] }\n`;
}
export const terminalFrames = (): string => framesOf([...goldenScreens(), ...paintedScreens]);

if (process.argv[1] === fileURLToPath(import.meta.url)) writeFileSync(framesPath, terminalFrames());
