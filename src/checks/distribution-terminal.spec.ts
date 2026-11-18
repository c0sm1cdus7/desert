import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { realTerminal } from "./real-terminal.ts";
const entry = join(import.meta.dirname, "../../tests/support/distribution-open.ts");
it.each(["normal", "shortcut"])(
  "opens the signed program hierarchy on a real terminal: %s",
  async mode => {
    const home = mkdtempSync(join(tmpdir(), "distribution-terminal-"));
    const term = realTerminal([process.execPath, entry, home, mode]);
    try {
      await term.until("Programas");
      const menu = await term.until("Sistema");
      expect(menu.join("\n")).toContain("Programas");
      term.press("n");
      if (mode === "normal") {
        const folders = await term.until("Herramientas");
        expect(folders.join("\n")).not.toContain("anotar");
        term.press("1");
      }
      const actions = await term.until("anotar");
      expect(actions.join("\n")).toContain("Acciones");
    } finally {
      await term.close();
      rmSync(home, { recursive: true, force: true });
    }
  },
  15000,
);
it.each([
  { cols: 100, rows: 30 },
  { cols: 40, rows: 16 },
])(
  "walks empty and optional assistant lists in one thread on a real terminal: %o",
  async size => {
    const home = mkdtempSync(join(tmpdir(), "distribution-lists-"));
    const term = realTerminal([process.execPath, entry, home], size);
    try {
      await term.until("Menú");
      term.press("i");
      await term.until("administra");
      term.press("1");
      await term.rest(100);
      term.press("g");
      const empty = await term.until("otra herramienta");
      expect(empty.join("\n")).toContain("Herramientas");
      expect(empty.join("\n")).toContain("terminar");
      expect(empty.join("\n")).not.toContain("›");
      term.press("o");
      await term.until("Identificador de la herramienta");
      term.press("\x1b");
      await term.until("[t] terminar");
      term.press("t");
      await term.until("Listo");
      term.press("\x1b");
      await term.rest(100);
      term.press("o");
      await term.until("Identidad anterior");
      term.press("legacy\r");
      await term.until("Nombre del asistente");
      term.press("Nora\r");
      const optional = await term.until("Herramientas · opcional");
      expect(optional.join("\n")).toContain("terminar");
      expect(optional.join("\n")).not.toContain("›");
      term.press("\r");
      const confirm = await term.until("enter volver");
      expect(confirm.join("\n")).not.toContain("ctrl o");
    } finally {
      await term.close();
      rmSync(home, { recursive: true, force: true });
    }
  },
  20000,
);
