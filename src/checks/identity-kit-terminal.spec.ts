import { expect, it } from "vitest";
import { kitTerminal } from "../../tests/support/kit-terminal.ts";
it("real terminal grants one action, cuts a running act, removes the whole tool and updates readers", async () => {
  const t = kitTerminal();
  try {
    await t.term.until("Menú");
    await t.press("i", "Mentes");
    await t.press("2", "pasar la administración");
    await t.press("h", "Programas");
    await t.press("1", "Sales");
    await t.press("1", "registrar");
    await t.press("1", "actual");
    await t.press("s", "Guardado");
    expect(await t.probe("beto", "register", { sale: "uno", total: 100 })).toContain("accepted");
    expect(await t.probe("beto", "wait", {}, "rejected")).toContain("fuera del kit");
    await t.press("\x1b", "registrar");
    expect(t.term.screen().join("\n")).toContain("sí");
    await t.press("2", "actual");
    await t.press("s", "Guardado");
    await t.probe("beto", "wait", {}, "processing");
    expect(await t.untilFile("observed.json", "Procesando")).toContain("Procesando");
    await t.press("\x1b", "esperar");
    await t.press("t", "Kit");
    await t.press("s", "Guardado");
    expect(await t.untilFile("result.json", "interrupted")).toContain("sacada");
    expect(await t.untilFile("observed.json", "sacada")).toContain("sacada");
    expect(await t.probe("beto", "register", { sale: "dos", total: 200 }, "rejected")).toContain("fuera del kit");
    expect(await t.untilFile("observed.json", "fuera del kit")).toContain("0 acciones");
    await t.press("\x1b", "registrar");
    expect(t.term.screen().join("\n")).toContain("no");
  } finally {
    await t.close();
  }
}, 20000);
it("real terminal gives and takes a mind action; the process changes from rejected to accepted and back", async () => {
  const t = kitTerminal();
  try {
    await t.term.until("Menú");
    expect(await t.probe("mind:sales", "register", { sale: "antes", total: 100 }, "rejected")).toContain(
      "fuera del kit",
    );
    await t.press("i", "Mentes");
    await t.press("3", "sales");
    await t.press("1", "registrar");
    expect(t.term.screen().join("\n")).toContain("[t]");
    await t.press("1", "actual");
    await t.press("s", "Guardado");
    expect(await t.probe("mind:sales", "register", { sale: "durante", total: 100 })).toContain("accepted");
    expect(await t.untilFile("observed.json", "Algunas acciones")).toContain("mente de sales");
    await t.press("\x1b", "registrar");
    await t.press("1", "actual");
    await t.press("n", "Guardado");
    expect(await t.probe("mind:sales", "register", { sale: "despues", total: 100 }, "rejected")).toContain(
      "fuera del kit",
    );
  } finally {
    await t.close();
  }
}, 20000);
it("real terminal lets a reader open menus but change nothing and an administrator has all without edits", async () => {
  const t = kitTerminal(undefined, "beto");
  try {
    await t.term.until("Menú");
    await t.press("i", "Mentes");
    await t.press("1", "pasar la administración");
    await t.press("h", "Programas");
    expect(t.term.screen().join("\n")).toContain("Todo, también lo nuevo");
    await t.press("1", "Sales");
    await t.press("1", "registrar");
    expect(t.term.screen().join("\n")).toContain("solo quien administra");
    await t.press("1", "registrar");
    expect(t.term.screen().join("\n")).not.toContain("actual");
    expect(t.term.screen().join("\n")).not.toContain("inventada");
  } finally {
    await t.close();
  }
}, 15000);
it("real terminal removes partial tools, persists whole grants and protects administration", async () => {
  const t = kitTerminal();
  try {
    await t.term.until("Menú");
    await t.press("i", "Mentes");
    await t.press("1", "pasar la administración");
    await t.press("h", "Programas");
    await t.press("1", "Sales");
    await t.press("1", "registrar");
    expect(t.term.screen().join("\n")).toContain("administra · todas");
    await t.press("1", "registrar");
    expect(t.term.screen().join("\n")).not.toContain("actual");
    await t.press("\x0f", "Menú");
    await t.press("i", "Mentes");
    await t.press("2", "pasar la administración");
    await t.press("h", "Programas");
    await t.press("1", "Sales");
    await t.press("1", "registrar");
    expect(t.term.screen().join("\n")).not.toContain("kit-set");
    await t.press("1", "actual");
    await t.press("s", "Guardado");
    await t.press("\x1b", "registrar");
    await t.press("t", "Kit");
    expect(t.term.screen().join("\n")).not.toContain("actual");
    await t.press("s", "Guardado");
    expect(await t.probe("beto", "register", { sale: "cortada", total: 100 }, "rejected")).toContain("fuera del kit");
    await t.press("\x1b", "registrar");
    await t.press("t", "actual");
    await t.press("d", "Guardado");
    await t.term.close();
    const again = kitTerminal(t.home, "beto");
    try {
      await again.term.until("Menú");
      await again.press("i", "Mentes");
      await again.press(" beto", "› beto");
      await again.press("\r", "pasar la administración");
      await again.press("h", "Programas");
      expect(again.term.screen().join("\n")).toContain("Algunas acciones");
      await again.press("1", "Sales");
      expect(again.term.screen().join("\n")).toContain("Todo, también lo nuevo");
      await again.press("1", "registrar");
      expect(again.term.screen().join("\n")).toContain("solo quien administra");
      await again.press("\x0f", "Menú");
      await again.press("i", "Mentes");
      await again.press(" mente de sales", "› mente de sales");
      await again.press("\r", "sales");
      await again.press("1", "registrar");
      expect(again.term.screen().join("\n")).toContain("solo quien administra");
      expect(again.term.screen().join("\n")).toContain("[t]");
    } finally {
      await again.term.close();
    }
  } finally {
    await t.close();
  }
}, 20000);
