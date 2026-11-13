// The test shop on a real terminal: keys as bytes, through the system's terminal and the program's own entry, and
// the screen read as the person reads it. What a check that sends intents to the router cannot see is seen here.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { realTerminal, screenOf, type RealTerminal } from "../../programs/real-terminal.ts";

const shop = join(import.meta.dirname, "../../../tests/support/shop-open.ts");
const open: { term: RealTerminal; home: string }[] = [];
afterEach(async () => {
  for (const { term, home } of open.splice(0)) {
    await term.close();
    rmSync(home, { recursive: true, force: true });
  }
});
/** The shop, opened as a person opens it, once its Menu is on the screen. */
async function seated(): Promise<RealTerminal> {
  const home = mkdtempSync(join(tmpdir(), "desert-real-"));
  const term = realTerminal([process.execPath, shop, home]);
  open.push({ term, home });
  await term.until("Menú");
  return term;
}
const paste = (text: string): string => `\x1b[200~${text}\x1b[201~`;
/** Sends one key in two pieces, as a slow line cuts it. */
async function inTwo(term: RealTerminal, first: string, rest: string): Promise<void> {
  term.press(first);
  await term.rest(5);
  term.press(rest);
}

describe("the test shop on a real terminal", () => {
  it("asks the terminal to say what is pasted, and stops asking when it leaves", async () => {
    const term = await seated();
    expect(term.written()).toContain("\x1b[?2004h");
    await term.close();
    expect(term.written().endsWith("\x1b[?1049l")).toBe(true);
    expect(term.written()).toContain("\x1b[?2004l");
  });
  it("writes what is pasted in a question, and its line breaks confirm nothing", async () => {
    const term = await seated();
    term.press("v");
    await term.until("Registradas");
    term.press("r");
    await term.until("Nombre de la venta");
    term.press(paste("café\r\nmolido\n"));
    const written = await term.until("› café molido");
    expect(written.some(line => line.includes("Total"))).toBe(false);
    expect(written.at(-1)).toContain("enter continuar");
    term.press("\r");
    await term.until("Total");
  });
  it("opens nothing with what is pasted on a menu", async () => {
    const term = await seated();
    term.press("v");
    await term.until("Registradas");
    term.press(paste("r\r"));
    await term.rest(200);
    expect(term.screen()[0]).toContain("Ventas");
    expect(term.screen().some(line => line.includes("Nombre de la venta"))).toBe(false);
  });
  it("moves once with an arrow whose bytes come apart: the second row opens", async () => {
    const term = await seated();
    await inTwo(term, "\x1b", "[B");
    term.press("\r");
    await term.until("Pagos");
  });
  it("neither leaves a question nor writes in it with an arrow whose bytes come apart", async () => {
    const term = await seated();
    term.press("v");
    await term.until("Registradas");
    term.press("r");
    await term.until("Nombre de la venta");
    await inTwo(term, "\x1b", "[A");
    await term.rest(200);
    expect(term.screen()[0]).toContain("Registrar");
    expect(term.screen().some(line => line.includes("Nombre de la venta"))).toBe(true);
  });
  it("goes back with an escape alone", async () => {
    const term = await seated();
    term.press("v");
    await term.until("Registradas");
    term.press("\x1b");
    await term.until("Herramientas");
    expect(term.screen()[0]).toContain("Menú");
  });
});
describe("the screen read back from what a terminal was sent", () => {
  it("is each row as it was last written, and empty after it was cleared", () => {
    expect(screenOf("\x1b[1;1H\x1b[1mMenú\x1b[0m  \x1b[2;1Huno\x1b[1;1HVentas", 3)).toEqual(["Ventas", "uno", ""]);
    expect(screenOf("\x1b[1;1Huno\x1b[2J\x1b[2;1Hdos", 2)).toEqual(["", "dos"]);
  });
});
