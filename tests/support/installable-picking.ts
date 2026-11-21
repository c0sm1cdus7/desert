// An installable program whose second tool picks things of the first through questions fed by its own state.
import { many, text, thing, when } from "../../src/fields/fields.ts";
import { defineMessage } from "../../src/fields/messages.ts";
import { object } from "../../src/fields/visible-text.ts";
import { componer } from "../../src/runtime/distributions/compose.ts";
import { DESERT_CONTRACT, programa, programAct, Type } from "../../src/tools/installable/program.ts";
import type { LocalProgram, ProgramGroup } from "../../src/tools/installable/program.ts";
import type { State } from "../../src/tools/tool-contract.ts";
import { presentation } from "./installable-program.ts";
type Item = Readonly<{ id: string; name: string }>;
type Extra = Readonly<{ item?: string; note?: string }>;
type Order = Readonly<{ id: string; main: string; spare?: string; extras: readonly Extra[] }>;
type Kept = Readonly<{ items: readonly Item[]; orders: readonly Order[] }>;
const taken = Type.Object({
  id: Type.String(),
  main: Type.String(),
  spare: Type.Optional(Type.String()),
  extras: Type.Array(Type.Object({ item: Type.Optional(Type.String()), note: Type.Optional(Type.String()) })),
});
const definition = {
  id: "picking",
  version: "1.0.0",
  desert: DESERT_CONTRACT,
  hechos: [
    { nombre: "picking/item-added", forma: Type.Object({ id: Type.String(), name: Type.String() }) },
    { nombre: "picking/order-taken", forma: taken },
  ],
  inicial: (): Kept => ({ items: [], orders: [] }),
} as const;
type Picking = LocalProgram<typeof definition & { codigo: readonly [string] }>;
export const pickingWords = {
  unknown: "cosa inexistente",
  empty: "sin cosas",
  pending: "sin pedidos",
  none: "Ninguno",
  byHand: "A mano",
  main: "Cosa",
  spare: "Repuesto",
  extra: "Extra {n}",
  note: "Descripción",
  more: { ask: "Otro extra", done: { title: "Listo", key: "l" }, another: { title: "Otro", key: "o" } },
  added: (id: string) => `Agregada · Cosa ${id}`,
  took: (id: string) => `Tomado · Pedido ${id}`,
  order: (id: string) => `Pedido ${id}`,
} as const;
const said = pickingWords;
const itemsOf = (state: State<Picking>) => state.tools.own.items;
const nameOf = (state: State<Picking>, id: string) => itemsOf(state).find(item => item.id === id)?.name ?? id;
const named = object({ name: text("Nombre", "Tornillo") });
const add = programAct<Picking, typeof named>({
  name: "nueva cosa",
  enter: "agregar",
  purpose: "sumar una cosa",
  key: "n",
  undoable: true,
  on: "tool",
  input: named,
  run: ({ name }, { state, by }) => {
    const id = String(itemsOf(state).length + 1);
    const fact = { layer: "program", kind: "picking/item-added", data: { id, name }, by, cause: [] } as const;
    return { status: "accepted", text: said.added(id), effects: [fact], made: [id] };
  },
  cases: [
    {
      promise: "Agrega una cosa",
      input: { name: "Tornillo" },
      then: { says: said.added("1"), facts: [{ kind: "picking/item-added", data: { id: "1", name: "Tornillo" } }] },
    },
  ],
});
const extra = object({
  item: Type.Optional(thing(said.extra, "items", said.byHand, undefined, said.empty)),
  note: when(text(said.note, "qué es"), answered => answered.item === undefined),
});
const order = object({
  main: thing(said.main, "items", undefined, undefined, said.empty),
  spare: Type.Optional(thing(said.spare, "items", said.none, undefined, said.empty)),
  extras: many(extra, said.more),
});
/** Every thing an order picks so far, wherever it stands in what was answered. */
function pickedIn(answered: Readonly<Record<string, unknown>>): readonly string[] {
  const extras = Array.isArray(answered.extras) ? answered.extras : [];
  const inExtras = extras.map((each: unknown) =>
    each !== null && typeof each === "object" && "item" in each ? each.item : undefined,
  );
  return [answered.main, answered.spare, ...inExtras].filter(value => typeof value === "string");
}
/** An order needs a thing to pick: its cases prepare it with the act of the other tool. */
const stocked = [{ act: "add", tool: "items", input: { name: "Tornillo" } }];
const take = programAct<Picking, typeof order>({
  name: "tomar",
  enter: "tomar",
  purpose: "tomar un pedido",
  key: "t",
  undoable: true,
  on: "tool",
  input: order,
  refuses: [said.unknown],
  choices: (source, state) =>
    source === "items" ? itemsOf(state).map(item => ({ value: item.id, title: item.name })) : undefined,
  stops: (answered, state) =>
    pickedIn(answered).every(id => itemsOf(state).some(item => item.id === id)) ? undefined : said.unknown,
  run: (input, { state, by }) => {
    const id = String(state.tools.own.orders.length + 1);
    const fact = { layer: "program", kind: "picking/order-taken", data: { id, ...input }, by, cause: [] } as const;
    return { status: "accepted", text: said.took(id), effects: [fact], made: [id] };
  },
  cases: [
    {
      promise: "Toma un pedido con un extra a mano",
      given: stocked,
      input: { main: "1", extras: [{ note: "Arandela suelta" }] },
      then: {
        says: said.took("1"),
        facts: [{ kind: "picking/order-taken", data: { id: "1", main: "1", extras: [{ note: "Arandela suelta" }] } }],
      },
    },
    {
      promise: "Toma un pedido con repuesto y un extra elegido",
      given: stocked,
      input: { main: "1", spare: "1", extras: [{ item: "1" }] },
      then: {
        says: said.took("1"),
        facts: [{ kind: "picking/order-taken", data: { id: "1", main: "1", spare: "1", extras: [{ item: "1" }] } }],
      },
    },
    {
      promise: "No toma una cosa que no existe",
      given: stocked,
      input: { main: "9", extras: [{ note: "Arandela suelta" }] },
      then: { refused: said.unknown },
    },
  ],
});
/** The orders that picked a thing, named so that the thing opens each of them. */
const ordersOf = (state: State<Picking>, id: string) =>
  state.tools.own.orders
    .filter(each => [each.main, each.spare, ...each.extras.map(extra => extra.item)].includes(id))
    .map(each => ({ id: each.id, text: said.order(each.id), tool: "orders" }));
const items: ProgramGroup<Picking> = {
  purpose: "Guardar cosas",
  palabras: {
    name: "Cosas",
    key: "c",
    listed: "Cosas",
    empty: "Sin cosas",
    reads: {},
    presents: [
      { title: "Cosa", empty: "Sin datos", reads: { name: "Nombre" } },
      { title: "Pedidos", empty: "Sin pedidos", reads: { orders: "Pedido" } },
    ],
  },
  acts: { add },
  targets: state => itemsOf(state).map(item => item.id),
  view: (state, target) =>
    target === "items"
      ? itemsOf(state)
          .map(item => JSON.stringify({ id: item.id, text: item.name }))
          .join("\n")
      : JSON.stringify({ name: nameOf(state, target), orders: ordersOf(state, target) }),
  summary: state => String(itemsOf(state).length),
};
/** A thing of the other tool, as a reading names it: its local id, its name and the tool it is of. */
const itemRow = (state: State<Picking>, id: string) => ({ id, text: nameOf(state, id), tool: "items" });
function orderRead(state: State<Picking>, id: string) {
  const found = state.tools.own.orders.find(each => each.id === id);
  if (!found) throw new Error(`Unknown order ${id}`);
  return {
    main: itemRow(state, found.main),
    spare: found.spare === undefined ? said.none : itemRow(state, found.spare),
    extras: found.extras.map(each => (each.item === undefined ? (each.note ?? "") : itemRow(state, each.item))),
  };
}
const orders: ProgramGroup<Picking> = {
  purpose: "Tomar pedidos de cosas",
  palabras: {
    name: "Pedidos",
    key: "p",
    listed: "Pedidos",
    empty: "Sin pedidos",
    reads: {},
    presents: [{ title: "Pedido", empty: "Sin datos", reads: { main: "Cosa", spare: "Repuesto", extras: "Extra" } }],
  },
  acts: { take },
  /** What needs someone is the tool itself, not one of its things: nobody took an order yet. */
  needs: state => (state.tools.own.orders.length ? [] : [{ target: "orders", why: said.pending }]),
  targets: state => state.tools.own.orders.map(each => each.id),
  view: (state, target) =>
    target === "orders"
      ? state.tools.own.orders
          .map(each => JSON.stringify({ id: each.id, text: said.order(each.id), detail: nameOf(state, each.main) }))
          .join("\n")
      : JSON.stringify(orderRead(state, target)),
  summary: state => String(state.tools.own.orders.length),
};
const skill = defineMessage({
  id: "fixture.picking.skill",
  kind: "skill",
  parameters: Type.Object({}),
  texts: { es: "Tomá pedidos de las cosas guardadas." },
});
export function pickingDistribution() {
  const program = programa(
    { ...definition, codigo: [import.meta.filename] },
    {
      purpose: "Elegir cosas guardadas",
      palabras: { name: "Elecciones", key: "e", itself: [] },
      skill,
      herramientas: { items, orders },
      plegar: (own, event): Kept => {
        if (event.layer !== "program") return own;
        if (event.kind === "picking/item-added") return { ...own, items: [...own.items, event.data] };
        return { ...own, orders: [...own.orders, event.data] };
      },
      summary: () => "Cosas y pedidos",
    },
  );
  return componer({
    programas: [program],
    identidades: true,
    mentes: { asistentes: false, programas: [] },
    presentacion: presentation,
  });
}
