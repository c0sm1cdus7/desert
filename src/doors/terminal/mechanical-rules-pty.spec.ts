// Un proceso real en una pseudoterminal confirma el acto y recibe el freno común del core.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { realTerminal } from "../../checks/real-terminal.ts";
import { rulesTexts } from "../../texts/rules.texts.ts";
it("el admin confirma una venta por la terminal real y la regla la frena", async () => {
  const home = mkdtempSync(join(tmpdir(), "mechanical-terminal-"));
  const terminal = realTerminal(
    [process.execPath, join(import.meta.dirname, "../../../tests/support/rules-terminal-open.ts"), home],
    { cols: 106, rows: 36 },
  );
  try {
    await terminal.until("[v] ventas");
    terminal.press("vrs1\r1500\r");
    expect((await terminal.until(rulesTexts.blocked)).join("\n")).toContain(rulesTexts.blocked);
    await terminal.close();
    expect(JSON.parse(readFileSync(join(home, "result.json"), "utf8"))).toEqual({ sales: 0, result: "rejected" });
  } finally {
    await terminal.close();
    rmSync(home, { recursive: true, force: true });
  }
}, 15000);
