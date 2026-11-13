// A program that is one tool with nothing but its settings: a till that says its float, changed where it is read.
import { object } from "../../src/catalogs/acts.ts";
import { money } from "../../src/catalogs/fields.ts";
import { vocabulary, type Event, type ProgramFacts } from "../../src/journal/events.ts";
import type { Shown } from "../../src/surface/bridge/house-ports.ts";
import { programAct, type Composition, type Offered, type ProgramTool } from "../../src/tools/promises.ts";
import type { Slices, State } from "../../src/tools/tool-contract.ts";

const floated = object({ float: money("Fondo") });
const nothing = object({});
const catalog = { "till-floated": floated, "till-closed": nothing };
type TillFact = ProgramFacts<typeof catalog>;
const till = vocabulary(catalog);
type Kept = Readonly<{ float: number; closed: boolean }>;
export type Till = { fact: TillFact; tools: { till: Kept } };
const step = (kept: Kept, event: Event<TillFact>): Kept => {
  if (event.kind === "till-floated") return { ...kept, float: event.data.float };
  return event.kind === "till-closed" ? { ...kept, closed: true } : kept;
};
const slices: Slices<Till> = { initial: { till: { float: 0, closed: false } }, step: { till: step } };
/** Why the float stays as it is: a closed till is not touched. */
const whyNot = (state: State<Till>): string | undefined => (state.tools.till.closed ? "cerrada" : undefined);
export const closedTill = { act: "close", input: {} };
export const floats = "till · float · the float of the till is changed where it is read";
const offer = {
  name: "fondo",
  enter: "cambiar",
  undoable: true,
  purpose: "con cuánto abre la caja",
  key: "f",
  on: "tool",
} as const;
/** Changing the float, declared as what it changes of what the till reads, or not. */
const floating = (how: Offered) =>
  programAct<Till, typeof floated>({
    ...how,
    input: floated,
    today: state => ({ float: state.tools.till.float }),
    refuses: ["cerrada"],
    offered: whyNot,
    run: (input, { by }) => ({
      status: "accepted",
      text: `Cambiado · Fondo · $ ${input.float}`,
      effects: [till.fact("till-floated", input, by)],
    }),
    cases: [
      {
        promise: "the float of the till is changed where it is read",
        input: { float: 500 },
        then: {
          says: "Cambiado · Fondo · $ 500",
          facts: [{ kind: "till-floated", data: { float: 500 } }],
          reads: { lines: [{ float: "$ 500" }] },
        },
      },
      {
        promise: "a closed till keeps its float",
        given: [closedTill],
        input: { float: 500 },
        then: { refused: "cerrada" },
      },
    ],
  });
const close = programAct<Till, typeof nothing>({
  name: "cerrar",
  enter: "cerrar",
  undoable: false,
  purpose: "deja de cambiar",
  key: "c",
  on: "tool",
  input: nothing,
  run: (_input, { by }) => ({
    status: "accepted",
    text: "Cerrada · Caja",
    effects: [till.fact("till-closed", {}, by)],
  }),
  cases: [
    {
      promise: "the till is closed",
      input: {},
      then: { says: "Cerrada · Caja", facts: [{ kind: "till-closed", data: {} }] },
    },
  ],
});
const tillTool = (how: Offered): ProgramTool<Till> => ({
  id: "till",
  purpose: "Keeps the float of the till.",
  targets: () => [],
  view: state =>
    JSON.stringify({ float: `$ ${state.tools.till.float}`, ...(state.tools.till.closed ? { state: "cerrada" } : {}) }),
  summary: state => `$ ${state.tools.till.float}`,
  acts: { float: floating(how), close },
});
const programWith = (how: Offered): Composition<Till> => ({ words: till, registry: [tillTool(how)], slices });
export const tillProgram = programWith({ ...offer, changes: "float" });
/** The same act, named as the datum and never saying it changes it: it would be read twice. */
export const looseTill = programWith(offer);
/** The same act, saying it changes a datum the till does not read. */
export const astrayTill = programWith({ ...offer, changes: "price" });
export const tillShown: Shown<Till> = {
  words: {
    till: {
      name: "Caja",
      key: "c",
      empty: "",
      listed: "Caja",
      reads: { float: "Fondo", state: "Estado" },
      presents: [],
    },
  },
  locale: { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" },
};
/** The same till, saying the stacks its own data goes in instead of one list. */
export const stackedTillShown: Shown<Till> = {
  ...tillShown,
  words: {
    till: {
      name: "Caja",
      key: "c",
      itself: [
        { title: "Fondo", empty: "Sin fondo.", reads: { float: "Fondo" } },
        { title: "Estado", empty: "Abierta.", reads: { state: "Estado" } },
      ],
    },
  },
};
/** The same stacks, with the one that holds the state left out. */
export const looseStacksShown: Shown<Till> = {
  ...tillShown,
  words: { till: { name: "Caja", key: "c", itself: [{ title: "Fondo", empty: "", reads: { float: "Fondo" } }] } },
};
