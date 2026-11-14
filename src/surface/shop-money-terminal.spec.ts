import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { realTerminal } from "../programs/real-terminal.ts";

const expected = (cents: number): string => {
  const whole = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/gu, ".");
  return `$ ${whole},${String(cents % 100).padStart(2, "0")}`;
};

it.each([0, 1, 1500, 9999999999999])(
  "keeps %i cents legible through a restart",
  async cents => {
    const home = mkdtempSync(join(tmpdir(), "shop-money-"));
    const command = [process.execPath, join(import.meta.dirname, "../../tests/support/shop-open.ts"), home];
    let term = realTerminal(command);
    try {
      await term.until("Menú");
      term.press("v");
      await term.until("[r] registrar");
      term.press("r");
      await term.until("Nombre de la venta");
      term.press("venta\r");
      await term.until("Total");
      term.press(String(cents));
      await term.until(`› ${expected(cents)}`);
      term.press("\r");
      await term.until("Listo Registrada");
      expect(term.screen().some(line => line.includes(`Total ${expected(cents)}`))).toBe(true);
      await term.close();
      term = realTerminal(command);
      await term.until("Menú");
      term.press("v");
      const list = await term.until("[1] venta");
      expect(list.find(line => line.includes("[1] venta"))).toContain(expected(cents));
      term.press("1");
      const object = await term.until("Cobrado");
      expect(object.find(line => line.includes("Total"))).toContain(expected(cents));
    } finally {
      await term.close();
      rmSync(home, { recursive: true, force: true });
    }
  },
  20000,
);

it("does not register an amount when the terminal closes before confirmation", async () => {
  const home = mkdtempSync(join(tmpdir(), "shop-interrupted-"));
  const command = [process.execPath, join(import.meta.dirname, "../../tests/support/shop-open.ts"), home];
  let term = realTerminal(command);
  try {
    await term.until("Menú");
    term.press("v");
    await term.until("[r] registrar");
    term.press("r");
    await term.until("Nombre de la venta");
    term.press("interrumpida\r");
    await term.until("Total");
    term.press("1500");
    await term.until("› $ 15,00");
    await term.close();
    term = realTerminal(command);
    await term.until("Menú");
    term.press("v");
    const list = await term.until("Sin ventas.");
    expect(list.join("\n")).not.toContain("interrumpida");
  } finally {
    await term.close();
    rmSync(home, { recursive: true, force: true });
  }
}, 20000);
