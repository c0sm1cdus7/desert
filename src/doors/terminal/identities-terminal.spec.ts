import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { realTerminal } from "../../programs/real-terminal.ts";
const entry = join(import.meta.dirname, "../../../tests/support/identities-open.ts");
it("passes administration with real terminal bytes, defaults to volver, and persists", async () => {
  const home = mkdtempSync(join(tmpdir(), "identities-terminal-"));
  const term = realTerminal([process.execPath, entry, home]);
  try {
    await term.until("Menú");
    term.press("i");
    const list = await term.until("nueva identidad");
    expect(list.join("\n")).toContain("Atención");
    expect(list.join("\n")).toContain("Actividad");
    term.press("2");
    await term.until("pasar la administración");
    term.press("p");
    await term.until("no se deshace");
    const confirmation = await term.until("enter volver");
    expect(confirmation.at(-1)).toContain("enter volver");
    term.press("\r");
    await term.until("pasar la administración");
    term.press("p");
    await term.until("no se deshace");
    term.press("p");
    await term.until("Pasada · Administración · beto");
    term.press("\x1b");
    await term.until("solo quien administra");
    await term.close();
    const again = realTerminal([process.execPath, entry, home]);
    try {
      await again.until("Menú");
      again.press("i");
      const reopened = await again.until("nueva identidad");
      expect(reopened.some(line => line.includes("beto") && line.includes("administra"))).toBe(true);
      expect(reopened.join("\n")).toContain("solo quien administra");
    } finally {
      await again.close();
    }
  } finally {
    await term.close();
    rmSync(home, { recursive: true, force: true });
  }
}, 15000);
it("creates with an optional name, shows the rule, removes and readmits through the real terminal", async () => {
  const home = mkdtempSync(join(tmpdir(), "identities-terminal-create-"));
  const term = realTerminal([process.execPath, entry, home]);
  try {
    await term.until("Menú");
    term.press("i");
    await term.until("nueva identidad");
    term.press("n");
    await term.until("Identificador");
    term.press("Mala\r");
    await term.until("puntos o guiones");
    expect(term.screen().join("\n")).not.toContain("Nombre · opcional");
    term.press("\x7f\x7f\x7f\x7fluz\r");
    await term.until("Nombre · opcional");
    term.press("\r");
    await term.until("Herramientas");
    expect(term.screen().join("\n")).not.toContain("[ ] identities");
    term.press(" \r");
    await term.until("Creada · luz");
    term.press("\x1b");
    await term.until("nueva identidad");
    term.press("3");
    await term.until("pasar la administración");
    term.press("s");
    await term.until("pierde las herramientas");
    const remove = await term.until("enter volver");
    expect(remove.at(-1)).toContain("enter volver");
    term.press("s");
    await term.until("Sacada · luz");
    term.press("\x1b");
    await term.until("Sin herramientas.");
    term.press("r");
    await term.until("enter readmitir");
    term.press("\r");
    await term.until("Readmitida · luz · sin herramientas");
    term.press("\x1b");
    const readmitted = await term.until("0 herramientas");
    expect(readmitted.join("\n")).toContain("Sin herramientas.");
  } finally {
    await term.close();
    rmSync(home, { recursive: true, force: true });
  }
}, 15000);
