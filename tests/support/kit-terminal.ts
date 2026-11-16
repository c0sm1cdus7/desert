import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { realTerminal } from "../../src/programs/real-terminal.ts";
export function kitTerminal(home = mkdtempSync(join(tmpdir(), "kit-terminal-")), by = "ana") {
  const term = realTerminal([process.execPath, join(import.meta.dirname, "kit-terminal-open.ts"), home, by], {
    cols: 106,
    rows: 36,
  });
  const read = (file: string) => readFileSync(join(home, file), "utf8");
  const untilFile = async (file: string, text: string) => {
    for (let i = 0; i < 250; i++) {
      const snapshot = existsSync(join(home, file)) ? read(file) : "";
      if (snapshot.includes(text)) return snapshot;
      await term.rest(20);
    }
    throw new Error(`${file} did not say ${text}: ${existsSync(join(home, file)) ? read(file) : "missing"}`);
  };
  const probe = async (by: string, act: string, input = {}, expected = "accepted") => {
    rmSync(join(home, "result.json"), { force: true });
    rmSync(join(home, "started.json"), { force: true });
    writeFileSync(join(home, "probe.json"), JSON.stringify({ by, act, input, surface: expected === "processing" }));
    return untilFile(expected === "processing" ? "started.json" : "result.json", expected);
  };
  const press = async (bytes: string, text: string) => {
    term.press(bytes);
    return term.until(text);
  };
  return {
    term,
    home,
    read,
    probe,
    press,
    untilFile,
    close: async () => {
      await term.close();
      rmSync(home, { recursive: true, force: true });
    },
  };
}
