import { join } from "node:path";
import { expect, it } from "vitest";
import { realTerminal } from "../programs/real-terminal.ts";
it("shows US$ on a real terminal, while typing and in the echoed answer and confirmation", async () => {
  const term = realTerminal([process.execPath, join(import.meta.dirname, "../../tests/support/money-open.ts")]);
  try {
    await term.until("Menú");
    term.press("v");
    await term.until("Registradas");
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
