import { Type } from "@sinclair/typebox";
import { expect, it, vi } from "vitest";
import { written } from "../bridge/questions/asking-parts.ts";
import { formats } from "../formats/masks.ts";
import { begin } from "../session/screen.ts";
import { startRouter } from "../router/router.ts";
import type { Result, Tool } from "./shown-tool.ts";
import { paint } from "../../doors/terminal/paint.ts";
import { textOf } from "../../doors/terminal/cells.ts";
const schema = Type.String({ title: "Credencial", secret: true, minLength: 8, maxLength: 13, pattern: "^x+$" });
function seat(optional = false) {
  const secret = vi.fn(() => "secret:00000000-0000-0000-0000-000000000000");
  const field = written(schema, {
    now: () => 0,
    today: () => "2026-11-14",
    formats: formats({ currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" }),
    optionalMark: "opcional",
    answers: [],
    n: 1,
    optional,
    secret,
  });
  const run = vi.fn((): Promise<Result> => Promise.resolve({ ok: true, text: "Guardado" }));
  const tool: Tool = {
    id: "data",
    name: "Datos",
    place: { key: "d", section: "tools" },
    summary: () => "",
    view: () => [],
    acts: {
      change: {
        label: "cambiar",
        verb: "cambiar",
        scope: "all",
        next: answers => (answers.length ? null : field),
        run,
      },
    },
  };
  const router = startRouter({
    defect: error => {
      throw error;
    },
    tools: [tool],
    bar: () => ({ state: "connected", clock: "00:00", now: 0 }),
    first: [begin([tool], "data", "change")],
  });
  const shown = () => textOf(paint(router.screen({ rows: 26 }), { cols: 80, rows: 30 })).join("\n");
  return { router, shown, secret, run };
}
for (const [name, typed, reason] of [
  ["vacío", "", "falta completar"],
  ["corto", "xxx", "mínimo 8 caracteres"],
  ["pegado largo", "x".repeat(14), "máximo 13 caracteres"],
  ["forma", "inventado", "formato inválido"],
  ["unicode", "🔒".repeat(7), "mínimo 8 caracteres"],
] as const)
  it(`H3: Enter explica el secreto ${name} en la terminal sin material ni referencia`, () => {
    const hands = seat();
    try {
      hands.router.send({ kind: "paste", text: typed });
      expect(hands.shown()).not.toContain(reason);
      hands.router.send({ kind: "confirm" });
      expect(hands.shown()).toContain(reason);
      if (typed) expect(hands.shown()).not.toContain(typed);
      expect(hands.secret).not.toHaveBeenCalled();
      expect(hands.run).not.toHaveBeenCalled();
    } finally {
      hands.router.stop();
    }
  });

for (const length of [8, 13])
  it(`un secreto de ${length} caracteres puede avanzar`, async () => {
    const hands = seat();
    try {
      hands.router.send({ kind: "paste", text: "x".repeat(length) });
      hands.router.send({ kind: "confirm" });
      await hands.router.idle();
      expect(hands.run).toHaveBeenCalledOnce();
    } finally {
      hands.router.stop();
    }
  });
it("el pegado largo queda entero, permite corregir y deja de mostrar el motivo", async () => {
  const hands = seat();
  try {
    hands.router.send({ kind: "paste", text: "x".repeat(14) });
    for (let n = 0; n < 2; n++) {
      hands.router.send({ kind: "confirm" });
      expect(hands.shown()).toContain("máximo 13 caracteres");
      expect(hands.run).not.toHaveBeenCalled();
    }
    expect(hands.secret).not.toHaveBeenCalled();
    hands.router.send({ kind: "erase" });
    expect(hands.shown()).not.toContain("máximo 13 caracteres");
    hands.router.send({ kind: "confirm" });
    await hands.router.idle();
    expect(hands.run).toHaveBeenCalledOnce();
  } finally {
    hands.router.stop();
  }
});
it("un secreto opcional vacío avanza sin motivo ni referencia", async () => {
  const hands = seat(true);
  try {
    hands.router.send({ kind: "confirm" });
    await hands.router.idle();
    expect(hands.run).toHaveBeenCalledOnce();
    expect(hands.secret).not.toHaveBeenCalled();
  } finally {
    hands.router.stop();
  }
});
