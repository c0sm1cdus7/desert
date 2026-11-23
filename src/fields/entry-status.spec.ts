// Input validity, live reasons and the unfilled shape are one behavior, before any action runs.
import { Type } from "@sinclair/typebox";
import { describe, expect, it, vi } from "vitest";
import { object } from "./visible-text.ts";
import { day, digits, holding, money } from "./fields.ts";
import { asking } from "../surface/bridge/questions/asking.ts";
import { formats } from "../surface/formats/masks.ts";
import { begin } from "../surface/session/screen.ts";
import { startRouter } from "../surface/router/router.ts";
import type { Result, Tool } from "../surface/contract/shown-tool.ts";
import { paint } from "../doors/terminal/paint.ts";
import { textOf } from "../doors/terminal/cells.ts";
function fail(error: unknown): never {
  throw error;
}
const locale = { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" };
const view = { rows: 26 };
const bar = () => ({ language: "es", state: "connected", clock: "00:00", now: 0 }) as const;
function seat(schema: Parameters<typeof asking>[0], stops?: (answers: readonly string[]) => string | undefined) {
  const ask = asking(schema, {
    now: () => Date.UTC(2026, 10, 11),
    today: () => "2026-11-11",
    formats: formats(locale),
    optionalMark: "opcional",
    language: "es" as const,
  });
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
  const router = startRouter({ defect: fail, tools: [tool], bar, first: [begin([tool], "data", "change")] });
  const type = (text: string) => {
    for (const char of text) router.send({ kind: "type", text: char });
  };
  const screen = () => router.screen(view);
  const enter = () => screen().hints.some(hint => hint.intent === "confirm");
  const check = (reason?: string) => {
    const before = screen();
    expect(enter()).toBe(false);
    router.send({ kind: "confirm" });
    expect(screen()).toEqual(
      reason && before.body.kind === "thread"
        ? {
            ...before,
            body: {
              ...before.body,
              events: [
                ...before.body.events.filter(event => !event.nested),
                { text: [{ text: reason, tone: "t3" }], nested: true },
              ],
            },
          }
        : before,
    );
    expect(run).not.toHaveBeenCalled();
  };
  return { router, run, type, screen, enter, check };
}
describe("the entry", () => {
  it("keeps the remaining day shape quiet until Enter explains the incomplete day", () => {
    const hands = seat(object({ date: day("Día") }));
    try {
      hands.check("falta completar");
      hands.type("0203");
      expect(hands.screen().body).toMatchObject({ events: [{ text: [{ text: "Día", tone: "t1" }] }] });
      hands.check("día incompleto");
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
      expect(hands.screen().body).toMatchObject({ events: [{ text: [{ text: "CUIT" }] }] });
      hands.check("dígitos incompletos");
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
      expect(JSON.stringify(hands.screen())).not.toContain("mínimo 02");
      hands.check("mínimo 02");
      expect(JSON.stringify(hands.screen())).toContain("mínimo 02");
      expect(JSON.stringify(hands.screen())).not.toContain("Error");
      expect(hands.run).not.toHaveBeenCalled();
      expect(hands.screen().body).toMatchObject({ entry: { typed: "01", padding: 1 } });
      const grid = paint(hands.screen(), { cols: 80, rows: 30 });
      const row = textOf(grid).findIndex(line => line.includes("› 01"));
      const col = textOf(grid)[row]?.indexOf("01") ?? -1;
      expect(grid[row]?.[col]?.tone).toBe("t3");
      expect(grid[row]?.[col + 1]?.tone).toBe("t1");
      hands.type("9");
      expect(hands.enter()).toBe(true);
      const full = hands.screen();
      if (full.body.kind !== "thread") throw new Error("Not a question");
      hands.type("9x");
      expect(hands.screen()).toEqual({
        ...full,
        body: {
          ...full.body,
          events: [
            ...full.body.events,
            { text: [{ text: "máximo 99", tone: "t3" }], nested: true, ignored: true },
            { text: [{ text: "solo números", tone: "t3" }], nested: true, ignored: true },
          ],
        },
      });
      expect(hands.enter()).toBe(true);
      expect(JSON.stringify(hands.screen())).toContain("solo números");
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
