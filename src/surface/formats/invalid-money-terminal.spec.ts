import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { realTerminal } from "../../checks/real-terminal.ts";
async function invalidScreen(): Promise<string> {
  const home = mkdtempSync(join(tmpdir(), "invalid-money-"));
  const term = realTerminal([
    process.execPath,
    join(import.meta.dirname, "../../../tests/support/invalid-money-open.ts"),
    home,
  ]);
  try {
    await term.until("Menú");
    term.press("v");
    await term.until("[r] registrar");
    term.press("r");
    await term.until("Nombre de la venta");
    term.press("venta\r");
    return (await term.until("Error")).join("\n");
  } finally {
    term.press("\x1b");
    await term.rest(100);
    await term.close();
    rmSync(home, { recursive: true, force: true });
  }
}
it("shows why the initial amount cannot be drawn", async () => {
  const screen = await invalidScreen();
  expect(screen).toContain("E-BASE-1 · Falló la base");
  expect(screen).toContain("importe");
  expect(screen).toContain("Total");
}, 20000);
