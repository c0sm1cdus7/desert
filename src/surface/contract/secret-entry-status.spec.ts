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
  ["empty", "", "falta completar"],
  ["short", "xxx", "mínimo 8 caracteres"],
  ["long paste", "x".repeat(14), "máximo 13 caracteres"],
  ["schema", "invented", "formato inválido"],
  ["unicode", "🔒".repeat(7), "mínimo 8 caracteres"],
] as const)
  it(`H3: Enter explains the ${name} secret in the terminal without material or reference`, () => {
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
  it(`a secret of ${length} characters can advance`, async () => {
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
it("a long paste stays whole, allows correcting and stops showing the reason", async () => {
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
it("an empty optional secret advances without reason or reference", async () => {
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
