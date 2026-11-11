// The test shop where a row says everything its act takes: what the act would refuse, the row already knows.
import { object } from "../../src/catalogs/acts.ts";
import { money } from "../../src/catalogs/fields.ts";
import { anyToolScreen } from "../../src/surface/bridge/any-tool.ts";
import { section, type ProgramScreen, type Shown } from "../../src/surface/bridge/house-ports.ts";
import { programAct, type Composition } from "../../src/tools/promises.ts";
import { paymentsTool, salesTool, shop, shopProgram, shopShown, type Shop } from "./shop.ts";

const marked = object({ paid: money("Cobrado") });
const nameOf = (target: string): string => target.replace("sales/", "");
export const registered = { act: "register", input: { sale: "s1", total: 1500 } };
export const overMarked = "sales · mark · a sale is not marked as paid more than its total";
/** Marking a sale says what it was paid, all at once: a row says how much, and the act only asks to be sure. */
const mark = programAct<Shop, typeof marked>({
  name: "marcar",
  enter: "marcar",
  undoable: true,
  purpose: "Dice cuánto se cobró de la venta.",
  key: "m",
  on: "thing",
  under: "marks",
  input: marked,
  confirms: ({ paid }) => `Marcar · $ ${paid}`,
  refuses: ["over"],
  run: ({ paid }, { by, state, target }) => {
    const total = state.tools.sales.get(nameOf(target))?.total ?? 0;
    if (paid > total) return { status: "rejected", reason: "over" };
    const fact = shop.fact("sale-corrected", { sale: nameOf(target), total, paid }, by);
    return { status: "accepted", text: `Marcada · ${nameOf(target)}`, effects: [fact] };
  },
  cases: [
    {
      promise: "a sale is marked as paid whole",
      given: [registered],
      on: "sales/s1",
      input: { paid: 1500 },
      then: {
        says: "Marcada · s1",
        facts: [{ kind: "sale-corrected", data: { sale: "s1", total: 1500, paid: 1500 } }],
      },
    },
    {
      promise: "a sale is not marked as paid more than its total",
      given: [registered],
      on: "sales/s1",
      input: { paid: 1501 },
      then: { refused: "over" },
    },
  ],
});
const marks = { name: "marcas", purpose: "Lo que se cobró.", key: "k" };
const sales = { ...salesTool, menus: { marks }, acts: { ...salesTool.acts, mark } };
export const markingShop: Composition<Shop> = { ...shopProgram, registry: [sales, paymentsTool] };
/** The menu of marks: one row for the whole total, and one for a peso more, which the act refuses. A screen that
 * knows it shows that row off, saying why; a careless one offers it as if it could be done. */
const marking =
  (knows: boolean): ProgramScreen<Shop> =>
  (ports, tool, words, acts, start) => {
    const plain = anyToolScreen(ports, tool, words, acts, start);
    return {
      ...plain,
      view: target => {
        const thing = target?.endsWith("#marks") ? target.slice(0, -"#marks".length) : undefined;
        const total = ports.state().tools.sales.get(nameOf(thing ?? ""))?.total;
        if (thing === undefined || total === undefined) return plain.view(target);
        const row = (paid: number, key: string, title: string) =>
          start("mark", thing, { today: { paid }, asks: [1], key, title, detail: `$ ${paid}` });
        const more = row(total + 1, "d", "de más");
        const over = knows ? { ...more, off: true, detail: `${more.detail ?? ""} · over` } : more;
        return [section("Marcas", [row(total, "t", "todo"), over])];
      },
    };
  };
export const knowingShown: Shown<Shop> = { ...shopShown, screens: { sales: marking(true) } };
export const carelessShown: Shown<Shop> = { ...shopShown, screens: { sales: marking(false) } };
