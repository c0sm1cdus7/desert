// A real terminal preserves the blocking reason without dispatching the chosen device.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { realTerminal } from "../../checks/real-terminal.ts";
import { rulesTexts } from "../../texts/rules.texts.ts";
it("blocks a device action confirmed by the admin through a real terminal", async () => {
  const home = mkdtempSync(join(tmpdir(), "mechanical-terminal-"));
  const terminal = realTerminal(
    [process.execPath, join(import.meta.dirname, "../../../tests/support/device-rules-terminal-open.ts"), home],
    { cols: 106, rows: 36 },
  );
  try {
    await terminal.until("[v] ventas");
    terminal.press("vrs1\r1500\r");
    expect((await terminal.until(rulesTexts.blocked)).join("\n")).toContain(rulesTexts.blocked);
    await terminal.close();
    expect(JSON.parse(readFileSync(join(home, "result.json"), "utf8"))).toEqual({
      sales: 0,
      result: "rejected",
      dispatched: 0,
      executions: 0,
      destination: { kind: "device", device: "mac" },
      reason: rulesTexts.blocked,
    });
  } finally {
    await terminal.close();
    rmSync(home, { recursive: true, force: true });
  }
}, 15000);
