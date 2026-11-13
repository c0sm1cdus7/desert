// Input validity, live reasons and the unfilled shape are one behavior, before any action runs.
import { Type } from "@sinclair/typebox";
import { describe, expect, it, vi } from "vitest";
import { object } from "../catalogs/acts.ts";
import { day, digits, holding, money, option, someOf } from "../catalogs/fields.ts";
import { asking } from "./bridge/asking.ts";
import { formats } from "./masks.ts";
import { begin } from "./screen.ts";
import { startRouter } from "./router.ts";
import type { Result, Tool } from "./shown-tool.ts";
import { paint } from "../doors/terminal/paint.ts";
import { textOf } from "../doors/terminal/cells.ts";

const locale = { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" };
const view = { rows: 26 };
const bar = () => ({ state: "connected", clock: "00:00", now: 0 }) as const;
function seat(schema: Parameters<typeof asking>[0], stops?: (answers: readonly string[]) => string | undefined) {
  const ask = asking(schema, { formats: formats(locale), optionalMark: "opcional" });
  const run = vi.fn((): Promise<Result> => Promise.resolve({ ok: true, text: "Cambiado" }));
  const tool: Tool = {
    id: "data",
    name: "Datos",
    place: { key: "d", section: "tools" },
    summary: () => "",
    view: () => [],
    acts: {
      change: { label: "cambiar", verb: "cambiar", scope: "all", next: ask.next, run, ...(stops ? { stops } : {}) },
    },
  };
  const router = startRouter({ tools: [tool], bar, first: [begin([tool], "data", "change")] });
  const type = (text: string) => {
    for (const char of text) router.send({ kind: "type", text: char });
  };
  const screen = () => router.screen(view);
  const enter = () => screen().hints.some(hint => hint.intent === "confirm");
  const check = () => {
    const before = screen();
    expect(enter()).toBe(false);
    router.send({ kind: "confirm" });
    expect(screen()).toEqual(before);
    expect(run).not.toHaveBeenCalled();
  };
  return { router, run, type, screen, enter, check };
}
describe("the Entrada", () => {
  it("keeps the remaining day shape in text 3, without a separate incomplete message", () => {
    const hands = seat(object({ date: day("Día") }));
    try {
      hands.check();
      hands.type("0203");
      hands.check();
      expect(hands.screen().body).toMatchObject({ entry: { typed: "02/03", remaining: "/aaaa" } });
      const grid = paint(hands.screen(), { cols: 80, rows: 30 });
      const lines = textOf(grid);
      const row = lines.findIndex(line => line.includes("02/03/aaaa"));
      expect(row).toBeGreaterThanOrEqual(0);
      const col = lines[row]?.indexOf("aaaa") ?? -1;
      expect(grid[row]?.slice(col, col + 4).every(cell => cell.tone === "t3")).toBe(true);
      hands.type("2026");
      expect(hands.enter()).toBe(true);
    } finally {
      hands.router.stop();
    }
  });
  it("shows a complete wrong check digit live in text 3 and offers no Enter", () => {
    const cuit = holding(digits("CUIT", "##-########-#"), value =>
      value.endsWith("6") ? undefined : "dígito inválido",
    );
    const hands = seat(object({ cuit }));
    try {
      hands.type("20123456780");
      hands.check();
      expect(hands.screen().body).toMatchObject({
        events: [{ text: [{ text: "CUIT", tone: "t1" }] }, { text: [{ text: "dígito inválido", tone: "t3" }] }],
      });
      hands.router.send({ kind: "erase" });
      hands.check();
      expect(hands.screen().body).toMatchObject({ events: [{ text: [{ text: "CUIT" }] }] });
      hands.type("6");
      expect(hands.enter()).toBe(true);
    } finally {
      hands.router.stop();
    }
  });
  it("shows stops live, before Enter, and clears the reason when the amount changes", () => {
    const hands = seat(object({ amount: money("Monto") }), answers =>
      Number(answers[0]) > 500 ? "supera lo que falta" : undefined,
    );
    try {
      hands.type("501");
      hands.check();
      expect(JSON.stringify(hands.screen())).toContain("supera lo que falta");
      expect(JSON.stringify(hands.screen())).not.toContain("Error");
      hands.router.send({ kind: "erase" });
      expect(hands.enter()).toBe(true);
    } finally {
      hands.router.stop();
    }
  });
  it("shows numeric bounds without Error and ignores excess or unsupported keys", () => {
    const field = Type.Integer({ title: "Días", minimum: 2, maximum: 60, mask: "padded", width: 2 });
    const hands = seat(object({ days: field }));
    try {
      hands.type("1");
      hands.check();
      expect(JSON.stringify(hands.screen())).not.toContain("mínimo 02");
      expect(hands.screen().body).toMatchObject({ entry: { typed: "01", padding: 1 } });
      const grid = paint(hands.screen(), { cols: 80, rows: 30 });
      const row = textOf(grid).findIndex(line => line.includes("› 01"));
      const col = textOf(grid)[row]?.indexOf("01") ?? -1;
      expect(grid[row]?.[col]?.tone).toBe("t3");
      expect(grid[row]?.[col + 1]?.tone).toBe("t1");
      hands.type("9");
      expect(hands.enter()).toBe(true);
      const full = hands.screen();
      hands.type("9x");
      expect(hands.screen()).toEqual(full);
      hands.router.send({ kind: "erase" });
      hands.router.send({ kind: "erase" });
      hands.type("99");
      hands.check();
      expect(JSON.stringify(hands.screen())).toContain("máximo 60");
    } finally {
      hands.router.stop();
    }
  });
  it("keeps Error in coral for the result of an action that actually ran", async () => {
    const hands = seat(object({ amount: money("Monto") }));
    hands.run.mockResolvedValue({ ok: false, reason: "sin respuesta" });
    try {
      hands.type("100");
      hands.router.send({ kind: "confirm" });
      await hands.router.idle();
      expect(hands.run).toHaveBeenCalledOnce();
      const body = hands.screen().body;
      expect(
        body.kind === "thread" &&
          body.events.some(event => event.text.some(span => span.text === "Error " && span.tone === "cut")),
      ).toBe(true);
      hands.type("1");
      expect(JSON.stringify(hands.screen())).not.toContain("Error");
    } finally {
      hands.router.stop();
    }
  });
});

describe("multiple choices before choosing", () => {
  it("checks each multiple-choice toggle and keeps the cursor on an available option", async () => {
    const field = someOf("Canales", "none", option("cloud", "Nube", "n"), option("market", "Mercado", "m"));
    const hands = seat(object({ channels: field }), answers =>
      answers[0]?.includes("Nube") ? "ya conectado" : undefined,
    );
    try {
      expect(hands.screen().body).toMatchObject({
        options: [
          { title: "Nube", off: true, detail: "ya conectado", selected: false },
          { title: "Mercado", selected: true },
        ],
      });
      hands.type(" ");
      hands.router.send({ kind: "up" });
      expect(hands.screen().body).toMatchObject({ options: [{ selected: false }, { key: "x", selected: true }] });
      hands.router.send({ kind: "confirm" });
      await hands.router.idle();
      expect(hands.run).toHaveBeenCalledWith(["Mercado"]);
    } finally {
      hands.router.stop();
    }
  });
  it("opens premarked options on a toggle that is allowed, so invalid initial marks can be removed", () => {
    const field = someOf("Canales", "all", option("cloud", "Nube", "n"), option("market", "Mercado", "m"));
    const hands = seat(object({ channels: field }), answers =>
      answers[0]?.includes("Nube") ? "ya conectado" : undefined,
    );
    try {
      expect(hands.screen().body).toMatchObject({
        options: [
          { title: "Nube", key: "x", selected: true },
          { title: "Mercado", key: "x", off: true, selected: false },
        ],
      });
      expect(hands.enter()).toBe(false);
      hands.type(" ");
      expect(hands.enter()).toBe(true);
      expect(hands.screen().body).toMatchObject({ options: [{ off: true, selected: false }, { selected: true }] });
    } finally {
      hands.router.stop();
    }
  });
});
