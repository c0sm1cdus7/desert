import "../../tests/support/fixture-vault.ts";
// A house opened by another shape of its program: what it kept is not trusted, and what it cannot read stops it.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { object } from "../catalogs/acts.ts";
import { money, text } from "../catalogs/fields.ts";
import { vocabulary } from "../journal/events.ts";
import { localPorts, startHouse, type HouseOptions } from "./house-runtime.ts";
import { shop, shopCatalog, shopRegistry, shopSlices, type Shop } from "../../tests/support/shop.ts";

const homes: string[] = [];
const houses: { close(): void }[] = [];
afterEach(() => {
  houses.splice(0).forEach(house => house.close());
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
const options: HouseOptions<Shop> = {
  by: "shop",
  projectionVersion: "shop/1",
  creation: { admin: "ana", assignments: [{ identity: "ana", tools: shopRegistry.map(tool => tool.id) }] },
  words: shop,
  registry: shopRegistry,
  slices: shopSlices,
};
/** A house where ana registered one sale and received its payment, closed with what it kept. */
const kept = (): string => {
  const path = mkdtempSync(join(tmpdir(), "desert-shape-"));
  homes.push(path);
  const house = startHouse<Shop>(path, options);
  const ana = localPorts(house, "ana", { recentLines: 20 });
  for (const target of ["sales", "payments"]) ana.act({ act: "attend", input: { target } }, 0);
  ana.act({ act: "register", target: "sales", input: { sale: "s1", total: 10 } }, 0);
  ana.act({ act: "receive", target: "payments", input: { payment: "p1", amount: 10, sale: "s1" } }, 0);
  house.close();
  return path;
};
const reopened = (path: string, changed: Partial<HouseOptions<Shop>>) => {
  const house = startHouse<Shop>(path, { ...options, ...changed });
  houses.push(house);
  return house.tools.state().tools;
};
/** The same shop, keeping every sale at twice what it was told. */
const doubling: typeof shopSlices.step.sales = (sales, event, before) => {
  const next = shopSlices.step.sales(sales, event, before);
  if (event.kind !== "sale-registered") return next;
  return new Map(next).set(event.data.sale, { total: event.data.total * 2, paid: 0, by: event.by });
};

describe("a house opened by another shape of its program", () => {
  it("comes back as it was kept while the program is the same", () => {
    expect(reopened(kept(), {}).sales.get("s1")).toEqual({ total: 10, paid: 10, by: "ana" });
  });

  it("folds its journal again from the first fact when the state of the program starts elsewhere", () => {
    const elsewhere = { ...shopSlices.initial, payments: { received: 5, unmatched: [] } };
    const slices = { initial: elsewhere, step: { ...shopSlices.step, sales: doubling } };
    const tools = reopened(kept(), { slices });
    expect(tools.sales.get("s1")).toEqual({ total: 20, paid: 10, by: "ana" });
    expect(tools.payments.received).toBe(15);
  });

  it("folds its journal again when the program declares its facts another way", () => {
    const asked = object({ sale: text("Venta", "Cómo se llama"), total: money("Total") });
    const other = vocabulary({ ...shopCatalog, "sale-registered": asked });
    const slices = { ...shopSlices, step: { ...shopSlices.step, sales: doubling } };
    expect(reopened(kept(), { words: other, slices }).sales.get("s1")?.total).toBe(20);
  });

  it("does not open when its journal holds a fact the program no longer reads, and names it", () => {
    const { "payment-received": _gone, ...fewer } = shopCatalog;
    const open = (): unknown => reopened(kept(), { words: vocabulary(fewer) });
    expect(open).toThrow(/does not read: #\d+ payment-received/);
  });
});
