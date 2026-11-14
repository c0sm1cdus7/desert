// Input validity, live reasons and the unfilled shape are one behavior, before any action runs.
import { describe, expect, it, vi } from "vitest";
import { object } from "../catalogs/acts.ts";
import { option, someOf } from "../catalogs/fields.ts";
import { asking } from "./bridge/asking.ts";
import { formats } from "./masks.ts";
import { begin } from "./screen.ts";
import { startRouter } from "./router.ts";
import type { Result, Tool } from "./shown-tool.ts";
function fail(error: unknown): never {
  throw error;
}
const locale = { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" };
const view = { rows: 26 };
const bar = () => ({ state: "connected", clock: "00:00", now: 0 }) as const;
function seat(schema: Parameters<typeof asking>[0], stops?: (answers: readonly string[]) => string | undefined) {
  const ask = asking(schema, {
    now: () => Date.UTC(2026, 10, 11),
    today: () => "2026-11-11",
    formats: formats(locale),
    optionalMark: "opcional",
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
  const check = () => {
    const before = screen();
    expect(enter()).toBe(false);
    router.send({ kind: "confirm" });
    expect(screen()).toEqual(before);
    expect(run).not.toHaveBeenCalled();
  };
  return { router, run, type, screen, enter, check };
}
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
