// A tool for the contract specs: its act asks every kind of question there is, and its lists hold every kind of row.
import type { Field } from "../../src/surface/contract/contract.ts";
import { MissingView, type Tool, type ToolAct, type ViewRow } from "../../src/surface/contract/shown-tool.ts";
import { formats } from "../../src/surface/formats/masks.ts";

const shapes = formats({ currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" });
const errands = [
  { id: "bread", title: "Pan", detail: "para hoy" },
  { id: "milk", title: "Leche", detail: "para mañana" },
];
const titleOf = (id: string): string => errands.find(errand => errand.id === id)?.title ?? id;
/** More days than a question shows at once, so its options are cut above or below. */
const days = Array.from({ length: 60 }, (_, day) => ({ title: `Día ${day + 1}` }));
/** More lines than a screen shows at once, so the list says how many are left below. */
const history = Array.from({ length: 60 }, (_, line) => ({ title: `Paso ${line + 1}`, detail: "anotado" }));
const questions: readonly Field[] = [
  {
    kind: "many",
    ask: "¿Qué lleva?",
    options: [
      { key: "p", title: "Pan" },
      { key: "l", title: "Leche" },
    ],
  },
  { kind: "one", ask: "¿Para cuándo?", options: days },
  {
    kind: "pick",
    of: "errands",
    ask: "¿Junto a cuál?",
    found: sought =>
      errands
        .filter(errand => errand.title.includes(sought))
        .map(errand => ({ title: errand.title, value: errand.id })),
    shown: titleOf,
    nothing: () => "Sin encargos",
  },
  { kind: "text", ask: "¿Cuánto cuesta?", mask: shapes.money, initial: "150000" },
  { kind: "text", ask: "¿Qué día?", mask: shapes.day },
  { kind: "secret", ask: "Clave del portón" },
];
const order: ToolAct = {
  label: "nuevo encargo",
  verb: "encargar",
  key: "n",
  scope: "all",
  next: answers => questions[answers.length] ?? null,
  run: () => Promise.resolve({ ok: true, text: "Encargado." }),
};
const listed = (): readonly ViewRow[] => [
  ...errands.map(errand => ({ title: errand.title, detail: errand.detail, opens: errand.id })),
  { title: "Archivo", detail: "cerrado hasta mañana", off: true },
  { title: "Nota", entry: { typed: "", caret: 0 }, press: () => undefined },
];
export function errandsTool(): Tool {
  return {
    id: "errands",
    name: "Encargos",
    place: { key: "e", section: "tools" },
    summary: () => `${errands.length} encargos`,
    find: sought =>
      errands
        .filter(errand => errand.title.toLowerCase().includes(sought.toLowerCase()))
        .map(errand => ({ title: errand.title, detail: errand.detail, opens: errand.id })),
    view: target => {
      if (target === undefined)
        return [
          { title: "Pendientes", rows: listed() },
          { title: "Hechos", empty: "Nada hecho.", rows: [] },
        ];
      const errand = errands.find(known => known.id === target);
      if (!errand) throw new MissingView("errands", target);
      return [{ title: "Encargo", reads: true, rows: [{ title: errand.title, detail: errand.detail }, ...history] }];
    },
    acts: { order },
  };
}
