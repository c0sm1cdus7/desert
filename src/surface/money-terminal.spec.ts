import { join } from "node:path";
import { expect, it } from "vitest";
import { realTerminal } from "../programs/real-terminal.ts";
it("shows US$ on a real terminal, while typing and in the echoed answer and confirmation", async () => {
  const term = realTerminal([process.execPath, join(import.meta.dirname, "../../tests/support/money-open.ts")]);
  try {
    await term.until("Menú");
    term.press("v");
    await term.until("[r] registrar");
    term.press("r");
    await term.until("Moneda");
    term.press("d");
    expect((await term.until("Precio")).some(line => line.includes("US$ 0,00"))).toBe(true);
    term.press("1005");
    await term.until("› US$ 10,05");
    term.press("\r");
    const screen = await term.until("Precio · US$ 10,05");
    expect(screen.some(line => line.includes("Precio US$ 10,05"))).toBe(true);
  } finally {
    await term.close();
  }
}, 15000);

it("explains empty and below-minimum amounts only on Enter in a real terminal", async () => {
  const term = realTerminal([process.execPath, join(import.meta.dirname, "../../tests/support/money-open.ts")], {
    cols: 40,
    rows: 16,
  });
  try {
    await term.until("Menú");
    term.press("v");
    await term.until("[r] registrar");
    term.press("r");
    await term.until("Moneda");
    term.press("d");
    await term.until("Precio");
    term.press("\r");
    await term.until("falta completar");
    term.press("0");
    await term.rest(50);
    expect(term.screen().some(line => line.includes("mínimo") || line.includes("falta completar"))).toBe(false);
    term.press("\r");
    const stopped = await term.until("mínimo US$ 0,01");
    expect(stopped.some(line => line.includes("Precio"))).toBe(true);
    expect(stopped.at(-1)).not.toContain("enter");
    term.press("1");
    await term.until("› US$ 0,01");
    expect(term.screen().some(line => line.includes("mínimo"))).toBe(false);
    term.press("\r");
    await term.until("Precio · US$ 0,01");
  } finally {
    await term.close();
  }
}, 15000);
