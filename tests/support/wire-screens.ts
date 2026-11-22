// The golden screens: every stop of the walk the renderer specs run, wired, one per line; regenerated, never edited.
import { join } from "node:path";
import { wire } from "../../src/surface/contract/wire.ts";
import { root } from "./sources.ts";
import { walked } from "./surface-tools.ts";

export const wireScreensPath = join(root, "tests/fixtures/wire-screens.json");
/** The fixture's text: each entry is the path that reaches a screen and that screen as it travels. */
export async function wireScreens(): Promise<string> {
  const lines = (await walked()).map(({ path, screen }) => JSON.stringify({ path, screen: wire(screen) }));
  return `{ "v": 1, "screens": [\n${lines.join(",\n")}\n] }\n`;
}
