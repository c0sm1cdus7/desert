import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { realTerminal } from "./real-terminal.ts";
const entry = join(import.meta.dirname, "../../tests/support/words-distribution-open.ts");
async function walk(mode: string, check: (term: ReturnType<typeof realTerminal>) => Promise<void>) {
  const home = mkdtempSync(join(tmpdir(), "distribution-words-"));
  const term = realTerminal([process.execPath, entry, home, mode]);
  try {
    await term.until("Menú");
    await check(term);
  } finally {
    await term.rest(80);
    await term.close();
    rmSync(home, { recursive: true, force: true });
  }
}
it("keeps an empty identifier quiet and explains only invalid typing", async () => {
  await walk("", async term => {
    term.press("i");
    await term.until("nueva identidad");
    term.press("n");
    const empty = (await term.until("Identificador")).join("\n");
    expect(empty).not.toContain("puntos o guiones");
    expect(empty).not.toContain("Error");
    expect(empty).not.toContain("enter");
    term.press("Mala");
    const invalid = (await term.until("puntos o guiones")).join("\n");
    expect(invalid).not.toContain("Error");
    expect(invalid).not.toContain("enter");
    term.press("\x7f".repeat(4) + "lucia");
    await term.until("enter continuar");
  });
}, 15000);
it("names both installed programs and their minds without exposing their ids", async () => {
  await walk("", async term => {
    term.press("i");
    const list = (await term.until("Mentes")).join("\n");
    expect(list).toContain("mente de Conversación");
    expect(list).not.toContain("conversacion");
    term.press("n");
    await term.until("Identificador");
    term.press("lucia\r");
    await term.until("Nombre");
    term.press("Lucía\r");
    const programs = (await term.until("[ ]")).join("\n");
    expect(programs).toContain("Programas");
    expect(programs).toContain("Conversación");
    expect(programs).not.toContain("conversacion");
  });
}, 15000);
it("keeps the menu count and leads from Attention to another identity's news", async () => {
  await walk("news", async term => {
    const menu = (await term.until("Requiere atención")).join("\n");
    expect(menu.split("\n").find(line => line.includes("[n]"))).toContain("1 nota");
    term.press("n");
    const program = (await term.until("Herramientas")).join("\n");
    const attention = program.split("Atención")[1]?.split("Actividad")[0];
    expect(attention).toContain("Nota de Lucía");
    expect(attention).not.toContain("Sin pendientes");
    term.press("\r");
    await term.until("Cantidad");
  });
}, 15000);
it("creates a person and gives a program, a tool and one loose action with named confirmations", async () => {
  await walk("", async term => {
    const press = async (keys: string, text: string) => {
      term.press(keys);
      await term.rest(80);
      return (await term.until(text)).join("\n");
    };
    await press("i", "nueva identidad");
    await press("n", "Identificador");
    await press("lucia\r", "Nombre");
    await press("Lucía\r", "Programas");
    await press("\r", "Creada · Lucía");
    await press("\x1b", "nueva identidad");
    await press("2", "pasar la administración");
    const identity = term.screen().join("\n");
    expect(identity).toContain("Kit");
    expect(identity).toContain("Sin acciones.");
    expect(identity).toContain("acciones que puede hacer");
    expect(identity).not.toContain("programas — programas");
    await press("h", "Programas");
    const programs = term.screen().join("\n");
    expect(programs).toContain("Conversación");
    expect(programs).not.toContain("conversacion");
    await press("2", "Conversación");
    const confirm = await press("t", "[d] dar");
    expect(confirm).toContain("Kit · Conversación · Lucía");
    expect(confirm).toContain("[v] volver");
    expect(confirm).not.toContain("[s] sí");
    await press("v", "Conversación"); // Returning must not grant anything.
    expect(term.screen().join("\n")).toContain("Sin acciones");
    await press("t", "[d] dar");
    await press("d", "Guardado · Programa · Conversación");
    await press("\x1b", "Conversación");
    await press("\x1b", "Programas");
    await press("1", "Personales");
    expect(term.screen().join("\n")).toContain("Compartidas");
    expect(term.screen().join("\n")).not.toContain("personal");
    await press("1", "anotar");
    expect(term.screen()[0]).toContain("Personales");
    expect(term.screen()[0]).not.toContain("/");
    const folder = await press("t", "[d] dar");
    expect(folder).toContain("Kit · Personales · Lucía");
    await press("d", "Guardado · Herramienta · Personales");
    await press("\x1b", "anotar");
    await press("\x1b", "Compartidas");
    await press("2", "anotar");
    await press("1", "Kit");
    await press("s", "Guardado · Acción · anotar");
    await press("\x1b", "anotar");
    await press("\x0f", "Menú");
    await press("i", "nueva identidad");
    expect(term.screen().join("\n")).toContain("1 programa · 1 herramienta · 1 acción");
    await press("2", "pasar la administración");
    await press("h", "Programas");
    await press("2", "Conversación");
    const take = await press("t", "[s] sacar");
    expect(take).toContain("Kit · Conversación · Lucía");
    expect(take.split("\n").find(line => line.includes("[d] dar"))).toContain("actual");
    await press("s", "Guardado · Programa · Conversación");
    await press("\x1b", "Conversación");
    expect(term.screen().join("\n")).toContain("Sin acciones");
  });
}, 25000);
