import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { realTerminal } from "../../programs/real-terminal.ts";
const entry = join(import.meta.dirname, "../../../tests/support/scene-terminal-open.ts");
const open = (home: string, by: string) => realTerminal([process.execPath, entry, home, by], { cols: 100, rows: 40 });
const general =
  "Preparando la lectura de la casa con sus identidades y sus herramientas " +
  "para continuar mañana sin perder el contexto completo.";
it("a non-admin writes its scene; another reads an ellipsis and the whole object after restart", async () => {
  const home = mkdtempSync(join(tmpdir(), "identity-scene-"));
  const writer = open(home, "beto");
  try {
    await writer.until("Menú");
    writer.press("i");
    await writer.until("Mentes");
    writer.press("2");
    await writer.until("escena");
    writer.press("e");
    await writer.until("General");
    writer.press(`${general}\r`);
    await writer.until("Guardada · Escena");
    await writer.close();
    const reader = open(home, "carla");
    try {
      await reader.until("Menú");
      reader.press("i");
      const list = (await reader.until("Preparando")).join("\n");
      expect(list).toContain("…");
      expect(list).not.toContain("contexto completo.");
      reader.press(" beto");
      await reader.until("› beto");
      reader.press("\r");
      await reader.until("contexto completo.");
      expect(reader.screen().join("\n")).toContain("Preparando la lectura");
    } finally {
      await reader.close();
    }
  } finally {
    await writer.close();
    rmSync(home, { recursive: true, force: true });
  }
}, 20000);
for (const by of ["beto", "ana"])
  it(`real terminal disables another identity's scene for ${by}`, async () => {
    const home = mkdtempSync(join(tmpdir(), "scene-owner-"));
    const term = open(home, by);
    try {
      await term.until("Menú");
      term.press("i");
      await term.until("Mentes");
      term.press("3");
      const screen = (await term.until("solo la escena propia")).join("\n");
      expect(screen).toContain("escena");
      term.press("e");
      await term.rest(100);
      expect(term.screen().join("\n")).not.toContain("General");
    } finally {
      await term.close();
      rmSync(home, { recursive: true, force: true });
    }
  }, 15000);
it("real terminal rejects invisible scene text with a reason and accepts a corrected answer", async () => {
  const home = mkdtempSync(join(tmpdir(), "scene-visible-"));
  const term = open(home, "beto");
  try {
    await term.until("Menú");
    term.press("i");
    await term.until("Mentes");
    term.press("2");
    await term.until("escena");
    term.press("e");
    await term.until("General");
    term.press("\u200b\r");
    await term.until("\u200b");
    await term.until("texto con algo visible");
    expect(term.screen().some(line => line.trim() === "texto con algo visible")).toBe(true);
    expect(term.screen().join("\n")).not.toContain("Guardada");
    term.press("\x7fAhora sí\r");
    await term.until("Guardada · Escena");
  } finally {
    await term.close();
    rmSync(home, { recursive: true, force: true });
  }
}, 15000);
it("real terminal shows addressed parts only to the viewer and reads the mind scene in Mentes", async () => {
  const home = mkdtempSync(join(tmpdir(), "scene-addressed-"));
  writeFileSync(
    join(home, "scenes.json"),
    JSON.stringify({
      beto: { general: "Escena compartida", to: { carla: "Revisión para Carla", ana: "Revisión para Ana" } },
      "mind:sales": { general: "Ventas preparadas", to: { carla: "Ventas para Carla" } },
    }),
  );
  try {
    for (const by of ["carla", "ana"]) {
      const term = open(home, by);
      try {
        await term.until("Menú");
        term.press("i");
        const list = (await term.until("Ventas preparadas")).join("\n");
        expect(list).toContain("Mentes");
        expect(list).not.toContain("Revisión para");
        term.press("2");
        await term.until(by === "carla" ? "Revisión para Carla" : "Revisión para Ana");
        expect(term.screen().join("\n")).not.toContain(by === "carla" ? "Revisión para Ana" : "Revisión para Carla");
        term.press("\x0f");
        await term.until("Menú");
        term.press("i");
        await term.until("Mentes");
        term.press("4");
        await term.until("Ventas preparadas");
        await term.until(by === "carla" ? "Ventas para Carla" : "Ventas preparadas");
        expect(term.screen().join("\n").includes("Ventas para Carla")).toBe(by === "carla");
      } finally {
        await term.close();
      }
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}, 20000);
