// The existing shop with a real recent window, references, a nested picker and observable list reads.
import { object } from "../../src/catalogs/acts.ts";
import { money, thing } from "../../src/catalogs/fields.ts";
import { programAct } from "../../src/tools/promises.ts";
import type { Shown } from "../../src/surface/bridge/house-ports.ts";
import { houseRouter } from "../../src/surface/bridge/house-router.ts";
import { houseTools } from "../../src/surface/bridge/house-tools.ts";
import { must } from "../../src/surface/window.ts";
import { shopRig } from "./shop-rig.ts";
import { correctingShop } from "./correcting-shop.ts";
import { makingRegistry } from "./charging-shop.ts";
import { shop, shopShown, type Shop } from "./shop.ts";

const selected = object({ sale: thing("Venta", "sales", undefined, undefined, "sin ventas") });
const select = programAct<Shop, typeof selected>({
  name: "elegir",
  enter: "elegir",
  key: "e",
  purpose: "una venta",
  undoable: true,
  on: "tool",
  input: selected,
  run: ({ sale }) => ({ status: "accepted", text: "Elegida · s1", target: sale, effects: [] }),
  cases: [
    {
      promise: "an existing sale is selected",
      given: [{ act: "register", input: { sale: "s1", total: 1500 } }],
      input: { sale: "sales/s1" },
      then: { says: "Elegida · s1", facts: [] },
    },
  ],
});
const charge = must(makingRegistry.find(tool => tool.id === "payments")?.acts.charge);
const pay = {
  ...charge,
  input: object({ sale: thing("Venta", "sales", undefined, "select"), amount: money("Monto") }),
};
const salesWith = (reads: number[], needs: number) => {
  const source = must(correctingShop.registry.find(tool => tool.id === "sales"));
  return {
    ...source,
    acts: { ...source.acts, select },
    words: (_state: unknown, target: string) => (target === "sales/s1" ? "antigua" : ""),
    needs: () => Array.from({ length: needs }, (_, i) => ({ target: `sales/s${i + 1}`, why: "Pendiente" })),
    view: (...args: Parameters<typeof source.view>) => {
      const [state, target, limits] = args;
      if (target !== source.id) return source.view(...args);
      reads.push(limits.recentLines);
      return source.view(state, target, limits).split("\n").slice(-limits.recentLines).reverse().join("\n");
    },
  };
};
const payments = {
  ...must(makingRegistry.find(tool => tool.id === "payments")),
  acts: { pay },
  view: () => JSON.stringify({ sale: { id: "sales/s1", text: "Primera venta" } }),
};
export function windowShop(count = 41, recentLines = 40, needs = 1) {
  const reads: number[] = [];
  const sales = salesWith(reads, needs);
  const rig = shopRig({ registry: [sales, payments] });
  const add = (n: number, by = "ana") => rig.bus.emit(shop.fact("sale-registered", { sale: `s${n}`, total: 1500 }, by));
  for (let i = 1; i <= count; i++) add(i);
  const shown: Shown<Shop> = {
    ...shopShown,
    words: {
      ...shopShown.words,
      payments: { name: "Pagos", key: "p", itself: [{ title: "Venta", empty: "", reads: { sale: "Venta" } }] },
    },
  };
  const ports = { ...rig.ports("ana", () => 1), limits: { recentLines } };
  const tools = houseTools(ports, shown);
  const router = houseRouter(ports, shown);
  const type = (text: string) => {
    for (const char of text) router.send({ kind: "type", text: char });
  };
  const screen = () => router.screen({ rows: 36 });
  const sale = must(tools.find(tool => tool.id === "sales"));
  return {
    rig,
    sales,
    shown,
    ports,
    tools,
    router,
    sale,
    reads,
    add,
    type,
    screen,
    close: () => {
      router.stop();
      rig.close();
    },
  };
}
