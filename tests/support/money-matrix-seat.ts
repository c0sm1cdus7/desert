import { object } from "../../src/catalogs/acts.ts";
import { money, text } from "../../src/catalogs/fields.ts";
import { asking } from "../../src/surface/bridge/asking.ts";
import type { Field, Intent } from "../../src/surface/contract.ts";
import { formats } from "../../src/surface/masks.ts";
import { resolve } from "../../src/surface/resolve.ts";
import { begin, type Running, type Session } from "../../src/surface/screen.ts";
import type { Tool } from "../../src/surface/shown-tool.ts";
import { finished, step } from "../../src/surface/step.ts";

export const matrixStates = [
  "vacío",
  "importe",
  "cero",
  "tope",
  "falta completar",
  "mínimo",
  "solo números",
  "cambió la moneda",
  "programa",
  "Error",
  "en vuelo",
  "confirmación",
  "más adelante",
  "terminada",
] as const;
export const matrixEvents = [
  "dígito",
  "cero",
  "borrar",
  "espacio",
  "menos",
  "más",
  "coma",
  "punto",
  "letra",
  "Enter",
  "izquierda",
  "derecha",
  "arriba",
  "abajo",
  "pegado",
  "moneda",
  "ida y vuelta",
  "bien",
  "Error",
  "otra persona",
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
function matrixTools(sale: { currency: string }, state: MatrixState): readonly Tool[] {
  const amount = money("Importe", 1, (_, state: typeof sale) => state.currency);
  const ask = asking(object({ amount, ...(state === "más adelante" ? { note: text("Nota", "Nota") } : {}) }), {
    state: () => sale,
    now: () => 17,
    today: () => "2026-11-13",
    optionalMark: "",
    formats: formats({ currency: "$", decimal: ",", thousands: ".", day: "dd/mm/aaaa" }),
  });
  const next = (answers: readonly string[]): Field | null =>
    ask.next(answers) ??
    (state === "confirmación" && answers.length === 1
      ? { kind: "confirm", ask: "Confirmar importe", reversible: true, options: [{ title: "anotar", key: "a" }] }
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
          stops: answers => (state === "programa" && answers[0] === "500" ? "importe retenido" : undefined),
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
    const moved = step(session, key, tools, 17);
    session = moved.session;
    running = moved.run ?? running;
  };
  const screen = () => resolve(session, tools, { state: "connected", clock: "00:00", now: 17 }, { rows: 40 });
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
      else if (event === "bien" || event === "Error") end(event === "bien");
      else {
        sale.currency = "US$";
        screen();
        if (event === "ida y vuelta") sale.currency = "$";
      }
    },
  };
}
export function readyMatrix(state: MatrixState) {
  const h = matrixSeat(state);
  if (!["vacío", "falta completar"].includes(state)) {
    const value = state === "tope" ? "9999999999999" : "500";
    h.send({ kind: "type", text: ["cero", "mínimo"].includes(state) ? "0" : value });
  }
  if (["falta completar", "mínimo", "Error", "en vuelo", "confirmación", "más adelante", "terminada"].includes(state))
    h.send({ kind: "confirm" });
  if (state === "solo números") h.send({ kind: "type", text: "x" });
  if (state === "cambió la moneda") {
    h.sale.currency = "US$";
    h.screen();
  }
  if (state === "Error") h.end(false);
  if (state === "terminada") h.end(true);
  return h;
}
