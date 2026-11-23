// A money field seated alone: every matrix state is reached, then one event is sent to it.
import { object } from "../../src/fields/visible-text.ts";
import { money, text } from "../../src/fields/fields.ts";
import { asking } from "../../src/surface/bridge/questions/asking.ts";
import type { Field, Intent } from "../../src/surface/contract/contract.ts";
import { formats } from "../../src/surface/formats/masks.ts";
import { resolve } from "../../src/surface/router/resolve.ts";
import { begin, type Running, type Session } from "../../src/surface/session/screen.ts";
import type { Tool } from "../../src/surface/contract/shown-tool.ts";
import { finished, step } from "../../src/surface/router/step.ts";

export const matrixStates = [
  "empty",
  "amount",
  "zero",
  "cap",
  "missing",
  "minimum",
  "digits-only",
  "currency-changed",
  "program-held",
  "failed",
  "in-flight",
  "confirmation",
  "later-field",
  "finished",
] as const;
export const matrixEvents = [
  "digit",
  "zero",
  "erase",
  "space",
  "minus",
  "plus",
  "comma",
  "dot",
  "letter",
  "Enter",
  "left",
  "right",
  "up",
  "down",
  "paste",
  "currency",
  "round-trip",
  "ok",
  "Error",
  "other-person",
] as const;
export type MatrixState = (typeof matrixStates)[number];
export type MatrixEvent = (typeof matrixEvents)[number];
export const failure = "el proveedor no respondió";
const keys: readonly Intent[] = [
  ...["7", "0"].map(text => ({ kind: "type", text }) as const),
  { kind: "erase" },
  ...[" ", "-", "+", ",", ".", "x"].map(text => ({ kind: "type", text }) as const),
  { kind: "confirm" },
  { kind: "left" },
  { kind: "right" },
  { kind: "up" },
  { kind: "down" },
  { kind: "paste", text: " \n-1.234,56\n " },
];
/** How the matrix asks: a fixed instant and day, the shop's money, read in Spanish. */
const matrixWords = {
  now: () => 17,
  today: () => "2026-11-13",
  optionalMark: "",
  language: "es" as const,
  formats: formats({ currency: "$", decimal: ",", thousands: ".", day: "dd/mm/aaaa" }),
};
function matrixTools(sale: { currency: string }, state: MatrixState): readonly Tool[] {
  const amount = money("Importe", 1, (_, state: typeof sale) => state.currency);
  const ask = asking(object({ amount, ...(state === "later-field" ? { note: text("Nota", "Nota") } : {}) }), {
    ...matrixWords,
    state: () => sale,
  });
  const next = (answers: readonly string[]): Field | null =>
    ask.next(answers) ??
    (state === "confirmation" && answers.length === 1
      ? {
          kind: "confirm",
          ask: "Confirmar importe",
          reversible: true,
          back: "volver",
          options: [{ title: "anotar", key: "a" }],
        }
      : null);
  return [
    {
      id: "data",
      name: "Datos",
      place: { key: "d", section: "tools" },
      summary: () => "",
      view: () => [],
      acts: {
        enter: {
          label: "anotar",
          verb: "anotar",
          scope: "all",
          next,
          stops: answers => (state === "program-held" && answers[0] === "500" ? "importe retenido" : undefined),
          run: () => Promise.resolve({ ok: true, text: "Listo" }),
        },
      },
    },
  ];
}
export function matrixSeat(state: MatrixState, sale = { currency: "$" }) {
  const tools = matrixTools(sale, state);
  let session: Session = [begin(tools, "data", "enter")];
  let running: Running | undefined;
  const send = (key: Intent) => {
    const moved = step(session, key, tools, 17, "es");
    session = moved.session;
    running = moved.run ?? running;
  };
  const screen = () =>
    resolve(session, tools, { language: "es", state: "connected", clock: "00:00", now: 17 }, { rows: 40 });
  const end = (ok: boolean) => {
    const current = session.at(-1);
    if (current?.kind !== "act") throw new Error("Expected action");
    const completion: Running = running ?? { ...current, phase: "running", since: -1 };
    session = finished(session, completion, ok ? { ok: true, text: "Listo" } : { ok: false, reason: failure });
  };
  return {
    sale,
    send,
    screen,
    end,
    session: () => session,
    event: (event: MatrixEvent) => {
      const key = keys[matrixEvents.indexOf(event)];
      if (key) send(key);
      else if (event === "ok" || event === "Error") end(event === "ok");
      else {
        sale.currency = "US$";
        screen();
        if (event === "round-trip") sale.currency = "$";
      }
    },
  };
}
export function readyMatrix(state: MatrixState) {
  const h = matrixSeat(state);
  if (!["empty", "missing"].includes(state)) {
    const value = state === "cap" ? "9999999999999" : "500";
    h.send({ kind: "type", text: ["zero", "minimum"].includes(state) ? "0" : value });
  }
  if (["missing", "minimum", "failed", "in-flight", "confirmation", "later-field", "finished"].includes(state))
    h.send({ kind: "confirm" });
  if (state === "digits-only") h.send({ kind: "type", text: "x" });
  if (state === "currency-changed") {
    h.sale.currency = "US$";
    h.screen();
  }
  if (state === "failed") h.end(false);
  if (state === "finished") h.end(true);
  return h;
}
