import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { realTerminal } from "./real-terminal.ts";
const entry = join(import.meta.dirname, "../../tests/support/author-terminal-open.ts");
const authors = [
  ["lucia", "Lucía"],
  ["unnamed", "unnamed"],
  ["retirada", "Inés"],
  ["mind:sales", "mente de Ventas"],
  ["assistant:lucia", "Nora, por Lucía"],
];
async function readRecord(home: string, id: string, name: string, pass: number) {
  const term = realTerminal([process.execPath, entry, home, id], { cols: 106, rows: 40 });
  try {
    await term.until("Menú");
    if (!pass) {
      const menu = (await term.until("Escrita · prueba")).join("\n");
      expect(menu).toContain("Atención");
      expect(menu).toContain("Actividad");
      const rows = menu.split("\n").filter(line => line.includes("Escrita · prueba"));
      expect(rows).toHaveLength(2);
      for (const row of rows) expect(row.trim()).toMatch(new RegExp(`${name}$`));
      term.press("1");
    } else {
      term.press("v");
      await term.until("Registradas");
      term.press("1");
    }
    const record = (await term.until("Registro")).join("\n");
    expect(record.split("\n").find(line => line.includes("Escrita · prueba"))).toContain(`${name} ·`);
    if (!id.includes(":")) expect(record.split("\n").find(line => line.includes("Creó"))).toContain(name);
  } finally {
    await term.close();
  }
}
it.each(authors)(
  "lee %s por su nombre en Atención, Actividad y Registro, también al reabrir",
  async (id, name) => {
    const home = mkdtempSync(join(tmpdir(), "author-terminal-"));
    try {
      for (let pass = 0; pass < 2; pass++) {
        await readRecord(home, id, name, pass);
      }
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  },
  20000,
);
it.each(authors)(
  "lee %s por su nombre en la cabecera y la referencia del hilo",
  async (id, name) => {
    const home = mkdtempSync(join(tmpdir(), "author-thread-"));
    const term = realTerminal([process.execPath, entry, home, id, "thread"], { cols: 106, rows: 40 });
    try {
      await term.until("Menú");
      term.press("v");
      const screen = (await term.until("Respuesta")).join("\n");
      expect(screen).toContain(`${name} · 10:00`);
      term.press("\x1b[A");
      await term.rest(50);
      term.press("Borrador");
      const reference = (await term.until("↳")).join("\n");
      expect(reference).toContain(`↳ ${name} · Respuesta`);
    } finally {
      await term.close();
      rmSync(home, { recursive: true, force: true });
    }
  },
  10000,
);
