import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { realTerminal } from "../../checks/real-terminal.ts";
import { expect, it } from "vitest";
import { checkMoneyScreen, InvalidMoney } from "./invalid-money.ts";
import { money } from "../../fields/fields.ts";
import { routerDefects } from "../router/router-defect.ts";
it("retains the technical cause and names the actual amount without labeling other defects as money", () => {
  const cause = new Error('Invalid cents: "-5"');
  const error = new InvalidMoney("Propina", cause);
  expect(error.cause).toBe(cause);
  const defects = routerDefects(
    () => [],
    () => ({ language: "es", state: "connected", clock: "00:00", now: 0 }),
    () => "E-BASE-1 · Falló la base",
    () => {},
  );
  expect(defects.failed(error)).toContain("Propina");
  expect(defects.failed(error)).not.toContain("Total");
  expect(defects.failed(new Error("other"))).toBe("E-BASE-1 · Falló la base");
});

it("keeps the invalid cents and their cause in the support entry", async () => {
  const home = mkdtempSync(join(tmpdir(), "money-detail-"));
  const term = realTerminal([
    process.execPath,
    join(import.meta.dirname, "../../../tests/support/invalid-money-open.ts"),
    home,
  ]);
  try {
    await term.until("Menú");
    term.press("v");
    await term.until("[r] registrar");
    term.press("r");
    await term.until("Nombre de la venta");
    term.press("venta\r");
    const screen = (await term.until("Error")).join("\n");
    expect(screen).not.toContain("-5");
    await term.rest(300);
    const db = new DatabaseSync(join(home, "journal.sqlite"), { readOnly: true });
    try {
      const entry = JSON.stringify(db.prepare("select data from events where kind = 'tool-entry'").all());
      expect(entry).toContain("-5");
      expect(entry).toContain("Invalid cents");
    } finally {
      db.close();
    }
  } finally {
    term.press("\x1b");
    await term.rest(100);
    await term.close();
    rmSync(home, { recursive: true, force: true });
  }
}, 20000);

it("identifies the field whose mask failed", () => {
  const field = checkMoneyScreen(money("Propina"), {
    kind: "text",
    ask: "Propina",
    mask: {
      keyboard: "digits",
      empty: "",
      put: typed => typed,
      shown: () => {
        throw new Error("Invalid cents: -5");
      },
    },
  });
  if (field.kind !== "text" || !("mask" in field)) throw new Error("missing mask");
  expect(() => field.mask.shown("-5")).toThrow(/Propina/u);
});
