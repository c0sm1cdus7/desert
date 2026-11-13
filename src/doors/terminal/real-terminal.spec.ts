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
/** The shop, opened as a person opens it, once its Menu is on the screen: a new one, or the one of this home. */
async function seated(home = mkdtempSync(join(tmpdir(), "desert-real-"))): Promise<RealTerminal> {
  const term = realTerminal([process.execPath, shop, home]);
  open.push({ term, home });
  await term.until("Menú");
  return term;
}
/** The last question of registering a sale: there, enter registers. */
async function atTheTotal(term: RealTerminal): Promise<void> {
  term.press("v");
  await term.until("Registradas");
  term.press("r");
  await term.until("Nombre de la venta");
  term.press("café\r");
  await term.until("Total");
}
/** Longer than a paste is given to end. */
const stall = 1300;
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
  it("registers nothing with a paste that stops for longer than its wait: its rest is still its text", async () => {
    const home = mkdtempSync(join(tmpdir(), "desert-real-"));
    const term = await seated(home);
    await atTheTotal(term);
    term.press("\x1b[200~15");
    await term.rest(stall);
    term.press("00\r\x1b[201~");
    const written = await term.until("› $ 15,00");
    expect(written.at(-1)).toContain("enter registrar");
    await term.close();
    const again = await seated(home);
    again.press("v");
    await again.until("Sin ventas.");
  });
  it("hears no key in a paste that never ends, and leaves with ctrl c", async () => {
    const term = await seated();
    await atTheTotal(term);
    term.press("\x1b[200~15");
    await term.rest(stall);
    term.press("00\r");
    await term.rest(200);
    /** Nothing of it was written or registered: the question is as it was. */
    expect(term.screen().some(line => line.includes("$ 0,00"))).toBe(true);
    expect(term.screen().some(line => line.includes("Registrada"))).toBe(false);
    term.press("\x03");
    await term.rest(300);
    expect(term.written().endsWith("\x1b[?1049l")).toBe(true);
  });
  it("ends a paste where its end comes, though a stall cut that end in two, and reads keys again", async () => {
    const term = await seated();
    await atTheTotal(term);
    term.press("\x1b[200~1500\x1b[20");
    await term.rest(stall);
    term.press("1~");
    await term.rest(200);
    /** The rest of its end was not typed after it: the total is what was pasted. */
    const written = await term.until("› $ 15,00");
    expect(written.at(-1)).toContain("enter registrar");
    term.press("\r");
    await term.until("Registrada");
  });
  it("pastes what follows the start of a paste that a stall cut after its escape: nothing opens", async () => {
    const term = await seated();
    term.press("v");
    await term.until("Registradas");
    term.press("\x1b");
    await term.rest(120);
    term.press("[200~r\r\x1b[201~");
    await term.until("Herramientas");
    await term.rest(200);
    expect(term.screen()[0]).toContain("Menú");
  });
  it("takes an escape left alone past its wait for the escape key: what follows is keys of its own", async () => {
    const term = await seated();
    term.press("\x1b");
    await term.rest(120);
    term.press("[B");
    term.press("\r");
    await term.until("Registradas");
    expect(term.screen()[0]).toContain("Ventas");
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
