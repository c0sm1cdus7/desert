import { describe, expect, it } from "vitest";
import { pickingDistribution, pickingWords as said } from "../../../tests/support/installable-picking.ts";
import { programChecks } from "../../checks/program-checks.ts";
import { goTo, seated, type, view, type Seat } from "../../checks/promises/promised-keys.ts";
import { cast, perform, staged, type House } from "../../checks/promises/promised-stage.ts";
import { stacksOf } from "../../surface/menus/lists.ts";
import type { Composition } from "../promises-contract.ts";
import { folderOf, objectOf } from "./destinations.ts";

const { program, shown } = pickingDistribution();
type Picking = typeof program extends Composition<infer X> ? X : never;
const folder = (group: string) => folderOf("picking", group);
const thingOf = (group: string, id: string) => objectOf("picking", group, id);
type Doing = Readonly<{ act: string; on: string; input: unknown }>;
async function accepted(house: House<Picking>, doing: Doing): Promise<void> {
  const done = await perform(house, "picking", doing);
  expect([done.status, done.reason]).toEqual(["accepted", undefined]);
}
const stock = async (house: House<Picking>, ...names: readonly string[]): Promise<void> => {
  for (const name of names) await accepted(house, { act: "items/add", on: folder("items"), input: { name } });
};
const rowsAt = (seat: Seat<Picking>, target?: string) =>
  stacksOf({ kind: "view", tool: "picking", at: 0, ...(target === undefined ? {} : { target }) }, seat.tools).flatMap(
    stack => stack.rows,
  );
/** The question a person has in front and what it offers, as the terminal draws it. */
function question(seat: Seat<Picking>) {
  const { body } = seat.router.screen(view);
  if (body.kind !== "thread") throw new Error("No question is being asked");
  return { ask: body.events.at(-1)?.text[0]?.text, options: body.options?.map(option => option.title) };
}
const confirm = (seat: Seat<Picking>): void => void seat.router.send({ kind: "confirm" });
const ordersKept = (house: House<Picking>) => house.tools.state().tools.picking.orders;

describe("a case that prepares with the other tool of its program", () => {
  for (const check of programChecks(program, shown)) it(check.name, check.run);
});
describe("questions that pick among the program's own things", () => {
  it("offers what choices gives, refuses an id that does not exist and says why nothing can be picked", () =>
    staged(program, async ({ house }) => {
      const seat = seated(house(), cast.admin, shown);
      try {
        goTo(seat, "picking", folder("orders"));
        const row = () => rowsAt(seat, folder("orders")).find(each => each.starts?.act === "orders/take");
        expect(row()).toMatchObject({ off: true, detail: said.empty });
        await stock(house(), "Tornillo", "Tuerca");
        expect(row()?.off).toBeUndefined();
        type(seat.router, "t");
        expect(question(seat)).toEqual({ ask: said.main, options: ["Tornillo", "Tuerca"] });
        const input = { main: "9", extras: [{ note: "Arandela" }] };
        const refused = await perform(house(), "picking", { act: "orders/take", on: folder("orders"), input });
        expect([refused.status, refused.reason]).toEqual(["rejected", said.unknown]);
        expect(ordersKept(house())).toEqual([]);
      } finally {
        seat.router.stop();
      }
    }));
  it("asks a field with when inside many only for the item that calls for it", () =>
    staged(program, async ({ house }) => {
      await stock(house(), "Tornillo", "Tuerca");
      const seat = seated(house(), cast.admin, shown);
      try {
        goTo(seat, "picking", folder("orders"));
        type(seat.router, "t");
        confirm(seat);
        confirm(seat);
        expect(question(seat).options).toEqual([said.byHand, "Tornillo", "Tuerca"]);
        confirm(seat);
        expect(question(seat).ask).toBe(said.note);
        type(seat.router, "Arandela");
        confirm(seat);
        expect(question(seat).ask).toBe(said.more.ask);
        type(seat.router, said.more.another.key);
        seat.router.send({ kind: "down" });
        confirm(seat);
        expect(question(seat).ask).toBe(said.more.ask);
        type(seat.router, said.more.done.key);
        confirm(seat);
        await seat.router.idle();
        expect(ordersKept(house())).toEqual([{ id: "1", main: "1", extras: [{ note: "Arandela" }, { item: "1" }] }]);
      } finally {
        seat.router.stop();
      }
    }));
  it("opens an optional thing on what its none is called and keeps the datum without it", () =>
    staged(program, async ({ house }) => {
      await stock(house(), "Tornillo");
      const seat = seated(house(), cast.admin, shown);
      try {
        goTo(seat, "picking", folder("orders"));
        type(seat.router, "t");
        confirm(seat);
        expect(question(seat)).toEqual({ ask: said.spare, options: [said.none, "Tornillo"] });
        const { body } = seat.router.screen(view);
        expect(body.kind === "thread" && body.options?.map(option => option.selected)).toEqual([true, false]);
        confirm(seat);
        seat.router.send({ kind: "down" });
        confirm(seat);
        type(seat.router, said.more.done.key);
        confirm(seat);
        await seat.router.idle();
        expect(ordersKept(house())).toEqual([{ id: "1", main: "1", extras: [{ item: "1" }] }]);
        const read = rowsAt(seat, thingOf("orders", "1")).find(each => each.title === said.spare);
        expect(read).toMatchObject({ detail: said.none });
      } finally {
        seat.router.stop();
      }
    }));
});
