// The picking fixture: its things, its orders and the extras of each order, three tools listed by their program.
import { fileURLToPath } from "node:url";
import { text } from "../../src/fields/fields.ts";
import { defineMessage } from "../../src/fields/messages.ts";
import { object } from "../../src/fields/visible-text.ts";
import { compose } from "../../src/runtime/distributions/compose.ts";
import { defineProgram, programAct, Type } from "../../src/tools/installable/program.ts";
import type { ProgramGroup } from "../../src/tools/installable/program.ts";
import type { Event } from "../../src/journal/vocabulary.ts";
import type { State } from "../../src/tools/tool-contract.ts";
import { presentation } from "./installable-program.ts";
import {
  definition,
  extraText,
  itemRow,
  itemsTool,
  orders,
  pickingWords as said,
} from "./installable-picking-tools.ts";
import type { Kept, Named, Picking } from "./installable-picking-tools.ts";
export { pickingWords } from "./installable-picking-tools.ts";
/** Every extra of every order, by its id `<order>.<n>`, with its order. */
const extrasOf = (state: State<Picking>) =>
  state.tools.own.orders.flatMap(order =>
    order.extras.map((extra, at) => ({ id: `${order.id}.${String(at + 1)}`, order: order.id, extra })),
  );
const written = object({ note: text(said.note, "qué es") });
/** Writes what an extra is. */
const note = programAct<Picking, typeof written>({
  name: "anotar",
  enter: "anotar",
  purpose: "anotar el extra",
  key: "a",
  undoable: true,
  on: "thing",
  input: written,
  run: ({ note }, { by, target }) => {
    const fact = {
      layer: "program",
      kind: "picking/extra-noted",
      data: { id: target, note },
      by,
      cause: [],
    } as const;
    return { status: "accepted", text: said.noted(target), effects: [fact] };
  },
  cases: [
    {
      promise: "Anota un extra de un pedido",
      /** The extra is of an order, and the order picks a thing: both are prepared with the other two tools. */
      given: [
        { act: "add", tool: "items", input: { name: "Tornillo" } },
        { act: "take", tool: "orders", input: { main: "1", extras: [{ item: "1" }] } },
      ],
      on: "1.1",
      input: { note: "Arandela" },
      then: {
        says: said.noted("1.1"),
        facts: [{ kind: "picking/extra-noted", data: { id: "1.1", note: "Arandela" } }],
      },
    },
  ],
});
/** The extras of the orders: one act on each extra, which its order also opens. */
const extras: ProgramGroup<Picking> = {
  purpose: "Anotar los extras de los pedidos",
  words: {
    name: "Extras",
    key: "x",
    listed: "Extras",
    empty: "Sin extras",
    reads: {},
    presents: [{ title: "Extra", empty: "Sin datos", reads: { what: "Qué", order: "Pedido" } }],
  },
  acts: { note },
  targets: state => extrasOf(state).map(each => each.id),
  view: (state, target) => {
    const found = extrasOf(state).find(each => each.id === target);
    if (!found)
      return extrasOf(state)
        .map(each => JSON.stringify({ id: each.id, text: extraText(state, each.extra) }))
        .join("\n");
    const { item, note } = found.extra;
    const what = item === undefined ? (note ?? "") : itemRow(state, item);
    return JSON.stringify({ what, order: { id: found.order, text: said.order(found.order), tool: "orders" } });
  },
  summary: state => String(extrasOf(state).length),
};
/** A fact folded into what the program keeps; a note replaces what was written of that extra. */
function fold(own: Kept, event: Event<Picking["fact"]>): Kept {
  if (event.layer !== "program") return own;
  if (event.kind === "picking/item-added") return { ...own, items: [...own.items, event.data] };
  if (event.kind === "picking/order-taken") return { ...own, orders: [...own.orders, event.data] };
  const { id, note } = event.data;
  const [order, at] = id.split(".");
  const noted = (each: Kept["orders"][number]) => ({
    ...each,
    extras: each.extras.map((extra, n) => (String(n + 1) === at ? { ...extra, note } : extra)),
  });
  return { ...own, orders: own.orders.map(each => (each.id === order ? noted(each) : each)) };
}
const skill = defineMessage({
  id: "fixture.picking.skill",
  kind: "skill",
  parameters: Type.Object({}),
  texts: { es: "Tomá pedidos de las cosas guardadas." },
});
/** How the program varies: what each item's reading adds. */
type Variant = Readonly<{ named?: Named }>;
export const pickingProgram = ({ named = {} }: Variant = {}) =>
  defineProgram(
    {
      ...definition,
      code: [import.meta.filename, fileURLToPath(new URL("./installable-picking-tools.ts", import.meta.url))],
    },
    {
      purpose: "Elegir cosas guardadas",
      words: { name: "Elecciones", key: "e", itself: [] },
      skill,
      tools: {
        items: itemsTool(named),
        orders,
        extras,
      },
      fold,
      summary: () => "Cosas, pedidos y sus extras",
    },
  );
/** The program composed alone. */
export const pickingDistribution = (variant: Variant = {}) =>
  compose({
    programs: [pickingProgram(variant)],
    identities: true,
    minds: { assistants: false, programs: [] },
    shown: presentation,
  });
