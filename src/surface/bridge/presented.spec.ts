// A thing in the stacks its tool declared: always the same stacks, what it names numbered, nothing left loose.
import { describe, expect, it } from "vitest";
import { presented } from "./presented.ts";

const stacks = [
  { title: "Venta", empty: "Sin datos.", reads: { total: "Total", state: "Estado" } },
  { title: "Cliente", empty: "Sin cliente.", reads: { client: "Cliente" } },
  { title: "Artículos", empty: "Sin artículos.", reads: { items: "Artículo" } },
  { title: "Cobros", empty: "Sin cobros.", reads: { payments: "Cobro" } },
];
const ana = { id: "clients/c1", text: "Ana" };
const shirt = { id: "products/p1", text: "2 × Remera", detail: "$ 5" };

describe("a thing presented", () => {
  it("shows every stack its tool declared, in that order, and one with nothing in it says so", () => {
    const shown = presented(stacks, { total: "$ 10", payments: [] }, "sales/s1");
    expect(shown.map(stack => stack.title)).toEqual(["Venta", "Cliente", "Artículos", "Cobros"]);
    expect(shown.every(stack => stack.reads)).toBe(true);
    expect(shown[0]?.rows).toEqual([{ title: "Total", detail: "$ 10", still: true }]);
    expect(shown.slice(1).map(stack => [stack.rows.length, stack.empty])).toEqual([
      [0, "Sin cliente."],
      [0, "Sin artículos."],
      [0, "Sin cobros."],
    ]);
  });

  it("reads a datum under its label, said once where there are several, and opens what the thing names", () => {
    const shown = presented(stacks, { client: ana, items: [shirt, "sin talle"] }, "sales/s1");
    expect(shown[1]?.rows).toEqual([{ title: "Ana", opens: "clients/c1", key: "1" }]);
    expect(shown[2]?.rows).toEqual([
      { title: "2 × Remera", detail: "$ 5", opens: "products/p1", key: "2" },
      { title: "", detail: "sin talle", still: true },
    ]);
  });

  it("numbers what the thing names down the whole thing, whatever stack it is in: the first nine", () => {
    const items = Array.from({ length: 10 }, (_, at) => ({ id: `products/p${at}`, text: `p${at}` }));
    const shown = presented(stacks, { client: ana, items }, "sales/s1");
    const keys = shown.flatMap(stack => stack.rows.map(row => row.key));
    expect(keys).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", undefined, undefined]);
  });

  it("refuses a datum no stack holds, and what is read as neither a datum nor a thing", () => {
    expect(() => presented(stacks, { total: "$ 10", by: "ana" }, "sales/s1")).toThrow(/by and no stack/u);
    expect(() => presented(stacks, { client: { name: "Ana" } }, "sales/s1")).toThrow(/sales\/s1\.client/u);
  });
});
