// Larger shop examples exercise the promises at the scale of an actual program.
import { object } from "../../src/catalogs/acts.ts";
import { money, thing, when } from "../../src/catalogs/fields.ts";
import { anyToolScreen } from "../../src/surface/bridge/any-tool.ts";
import { section, type Shown } from "../../src/surface/bridge/house-ports.ts";
import { toolTexts } from "../../src/texts/tools.texts.ts";
import { programAct, type Composition } from "../../src/tools/promises.ts";
import { shopProgram, shopShown, salesTool, paymentsTool, type Shop } from "./shop.ts";

export const derivedWords = {
  cause: "traída del fisco, sin cambios a mano",
  closed: "archivada",
  datum: "dato conservado en Editar",
  done: "Revisada · Venta",
};
const input = object({ amount: when(money("Cotización", 1), () => true) });
const given = [{ act: "register", input: { sale: "s1", total: 1500 } }];
const review = programAct<Shop, typeof input>({
  name: "revisar",
  enter: "revisar",
  key: "x",
  purpose: "la venta",
  undoable: true,
  on: "thing",
  input,
  refuses: ["falta cotización"],
  stops: ({ amount }) => (amount === undefined ? "falta cotización" : undefined),
  run: () => ({ status: "accepted", text: derivedWords.done }),
  cases: [
    {
      promise: "reviews a sale",
      given,
      on: "sales/s1",
      input: { amount: 100 },
      then: { says: derivedWords.done, facts: [] },
    },
    {
      promise: "cannot finish an empty amount",
      given,
      on: "sales/s1",
      input: {},
      then: { refused: "falta cotización" },
    },
  ],
});
const closed = programAct<Shop, typeof input>({
  name: "archivar",
  enter: "archivar",
  key: "a",
  purpose: "la venta",
  undoable: true,
  on: "thing",
  input,
  refuses: [derivedWords.closed],
  offered: () => derivedWords.closed,
  datum: () => derivedWords.datum,
  run: () => ({ status: "accepted", text: derivedWords.done }),
  cases: [
    {
      promise: "reads a closed sale",
      given,
      on: "sales/s1",
      input: { amount: 100 },
      then: { refused: derivedWords.closed },
    },
  ],
});
export function derivedShop(menu = false, cause = derivedWords.closed, long = false): Composition<Shop> {
  const under = menu ? { under: "edit" } : {};
  const acts = {
    ...salesTool.acts,
    review: { ...review, ...under },
    archive: {
      ...closed,
      ...under,
      refuses: [cause],
      offered: () => cause,
      cases: closed.cases.map(kase => ({ ...kase, then: { refused: cause } })),
    },
  };
  return {
    ...shopProgram,
    registry: [
      {
        ...salesTool,
        acts,
        view: (state, target, limits) =>
          long && target !== "sales"
            ? JSON.stringify({
                related: { id: target, text: "Venta" },
                notes: Array.from({ length: 70 }, (_, i) => `Dato ${i}`),
              })
            : salesTool.view(state, target, limits),
        menus: menu ? { edit: { name: "editar", key: "e", purpose: "la venta" } } : {},
      },
      paymentsTool,
    ],
  };
}
export const derivedShown = (long = false): Shown<Shop> => ({
  ...shopShown,
  words: {
    ...shopShown.words,
    sales: {
      ...shopShown.words.sales,
      name: "Ventas",
      key: "v",
      empty: "Sin ventas.",
      listed: "Registradas",
      reads: {},
      presents: long
        ? [{ title: "Datos", empty: "Sin datos", reads: { related: "Venta", notes: "Notas" } }]
        : [
            { title: "Venta", empty: "Sin datos.", reads: { total: "Total", paid: "Cobrado" } },
            { title: "Actividad", empty: "Sin actividad.", reads: { by: "Creó" } },
          ],
    },
  },
  screens: {
    sales: (ports, tool, words, acts, start) => {
      const plain = anyToolScreen(ports, tool, words, acts, start);
      return {
        ...plain,
        view: target => {
          if (target?.endsWith("#edit"))
            return [
              section("Editar", [
                start("review", "sales/s1", { title: "revisar", key: "x" }),
                start("archive", "sales/s1", { title: "archivar", key: "a", detail: derivedWords.datum }),
              ]),
            ];
          return plain.view(target);
        },
      };
    },
  },
});
const picked = object({ sale: thing("Venta", "sales", undefined, "register", "sin ventas") });
const choose = programAct<Shop, typeof picked>({
  name: "elegir",
  enter: "elegir",
  key: "c",
  purpose: "una venta",
  undoable: true,
  on: "tool",
  input: picked,
  today: () => ({ sale: "sales/s1" }),
  refuses: ["otra apagada", toolTexts.unchanged],
  among: () => ({ sales: value => (value === "sales/s2" ? "otra apagada" : undefined) }),
  run: () => ({ status: "accepted", text: "Elegida · Venta" }),
  cases: [
    {
      promise: "current follows eligible sales",
      given: [
        ...given,
        { act: "register", input: { sale: "s2", total: 100 } },
        { act: "register", input: { sale: "s3", total: 100 } },
      ],
      input: { sale: "sales/s2" },
      then: { refused: "otra apagada" },
    },
  ],
});
export const orderedShop: Composition<Shop> = {
  ...shopProgram,
  registry: [{ ...salesTool, acts: { ...salesTool.acts, choose } }, paymentsTool],
};
