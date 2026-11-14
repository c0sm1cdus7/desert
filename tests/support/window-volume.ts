// Seeded in-memory shop state isolates rendering costs from writing thousands of facts.
import { must } from "../../src/surface/window.ts";
import { houseRouter } from "../../src/surface/bridge/house-router.ts";
import { houseTools } from "../../src/surface/bridge/house-tools.ts";
import { resolve } from "../../src/surface/resolve.ts";
import { start } from "../../src/surface/screen.ts";
import { shopShown } from "./shop.ts";
import { windowShop } from "./window-shop.ts";

type Rig = ReturnType<typeof windowShop>;
type Calls = { sales: number; payments: number };
const stateOf = (rig: Rig, count: number) => {
  return {
    ...rig.ports.state(),
    tools: {
      ...rig.ports.state().tools,
      sales: new Map(Array.from({ length: count }, (_, i) => [`s${i + 1}`, { total: 1500, paid: 0, by: "ana" }])),
    },
  };
};
const registryOf = (rig: Rig, calls: Calls, count: number, notices: number) => {
  return (["sales", "payments"] as const).map(id => ({
    ...rig.sales,
    id,
    acts: {},
    menus: {},
    targets: () => Array.from({ length: count }, (_, i) => `${id}/s${i + 1}`),
    needs: () => Array.from({ length: notices / 2 }, (_, i) => ({ target: `${id}/s${i + 1}`, why: "Pendiente" })),
    view: (...args: Parameters<typeof rig.sales.view>) => {
      const [state, target, limits] = args;
      if (target !== id) return JSON.stringify({ total: "$ 1500", paid: "$ 0", by: "ana" });
      calls[id]++;
      return [...state.tools.sales.keys()]
        .slice(-limits.recentLines)
        .reverse()
        .map(sale => JSON.stringify({ id: `${id}/${sale}`, text: sale }))
        .join("\n");
    },
  }));
};
const shown = {
  ...shopShown,
  words: {
    sales: must(shopShown.words.sales),
    payments: {
      name: "Pagos",
      key: "p",
      listed: "Pagos",
      empty: "",
      reads: {},
      presents: [],
    },
  },
};
export function windowVolume(count: number, notices = 200, ticking = false) {
  const rig = windowShop(0, 40, 0);
  const state = stateOf(rig, count);
  const calls = { sales: 0, payments: 0 };
  const registry = registryOf(rig, calls, count, notices);
  let now = 1;
  const ports = { ...rig.ports, registry, state: () => state, now: () => (ticking ? now++ : now) };
  const router = houseRouter(ports, shown);
  const tools = houseTools(ports, shown);
  const menu = () => router.screen({ rows: 36 });
  const old = () =>
    resolve(
      [...start, { kind: "view", tool: "sales", target: "sales/s1", at: 0 }],
      tools,
      { state: "connected", clock: "00:00", now: 1 },
      { rows: 36 },
    );
  return {
    menu,
    old,
    calls,
    close: () => {
      router.stop();
      rig.close();
    },
  };
}
