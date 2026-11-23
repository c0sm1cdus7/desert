// A real process in a pseudoterminal confirms the act and receives the core's common block.
import { said } from "../../fields/phrases.ts";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { realTerminal } from "../../checks/real-terminal.ts";
import { rulesTexts } from "../../texts/rules.texts.ts";
it("the admin confirms a sale through the real terminal and the rule blocks it", async () => {
  const home = mkdtempSync(join(tmpdir(), "mechanical-terminal-"));
  const terminal = realTerminal(
    [process.execPath, join(import.meta.dirname, "../../../tests/support/rules-terminal-open.ts"), home],
    { cols: 106, rows: 36 },
  );
  try {
    await terminal.until("[v] ventas");
    terminal.press("vrs1\r1500\r");
    expect((await terminal.until(said(rulesTexts.blocked, "es"))).join("\n")).toContain(rulesTexts.blocked.es);
    await terminal.close();
    expect(JSON.parse(readFileSync(join(home, "result.json"), "utf8"))).toEqual({ sales: 0, result: "rejected" });
  } finally {
    await terminal.close();
    rmSync(home, { recursive: true, force: true });
  }
}, 15000);
