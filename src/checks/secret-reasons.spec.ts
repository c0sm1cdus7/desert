// The real terminal must explain invalid material without echoing it or invoking the action.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { realTerminal } from "./real-terminal.ts";
it("H3: Enter explains empty, short, format and long paste in the real terminal", async () => {
  const home = mkdtempSync(join(tmpdir(), "secret-reasons-pty-"));
  const term = realTerminal(
    [process.execPath, join(import.meta.dirname, "../../tests/support/opacity-open.ts"), home, "bounded"],
    { cols: 40, rows: 16 },
  );
  try {
    await term.until("Menú");
    term.press("c");
    await term.until("Custodia");
    for (const [material, reason] of [
      ["", "falta completar"],
      ["xxx", "mínimo 8 caracteres"],
      ["invented", "formato inválido"],
      ["x".repeat(14), "máximo 13 caracteres"],
    ] as const) {
      term.press("g");
      await term.until("Primer material");
      if (material) term.press(`\x1b[200~${material}\x1b[201~`);
      term.press("\r");
      await term.until(reason);
      if (material) expect(term.written().includes(material)).toBe(false);
      expect(term.written()).not.toContain("Material · Confirmar");
      term.press("\x1b");
      await term.until("[g] guardar");
    }
  } finally {
    await term.close();
    rmSync(home, { recursive: true, force: true });
  }
}, 15000);
