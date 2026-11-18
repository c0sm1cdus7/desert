import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { realTerminal } from "../checks/real-terminal.ts";
import { sceneLimits } from "./own-acts.ts";
const entry = join(import.meta.dirname, "../../tests/support/scene-terminal-open.ts");
it("a 4000-character scene, wide characters and addressed text can be read in a 40x16 terminal", async () => {
  const home = mkdtempSync(join(tmpdir(), "scene-small-"));
  const tail = "\nFinal de escena 🦫";
  const general = "a".repeat(sceneLimits.general - tail.length) + tail;
  expect(general.length).toBe(sceneLimits.general);
  writeFileSync(
    join(home, "scenes.json"),
    JSON.stringify({ beto: { general, to: { carla: "Última parte dirigida" } } }),
  );
  const term = realTerminal([process.execPath, entry, home, "carla"], { cols: 40, rows: 16 });
  try {
    await term.until("Menú");
    term.press("i");
    await term.until("beto");
    term.press("2");
    await term.until("[h] programas");
    let sawGeneral = false,
      sawPart = false,
      sawCount = false;
    for (let n = 0; n < 150 && !(sawGeneral && sawPart); n++) {
      term.press("\x1b[A");
      await term.rest(20);
      const screen = term.screen().join("\n");
      sawGeneral ||= screen.includes("Final de escena 🦫");
      sawPart ||= screen.includes("Última parte dirigida");
      sawCount ||= screen.includes("más");
    }
    expect(sawGeneral).toBe(true);
    expect(sawPart).toBe(true);
    expect(sawCount).toBe(true);
  } finally {
    await term.close();
    rmSync(home, { recursive: true, force: true });
  }
}, 15000);
