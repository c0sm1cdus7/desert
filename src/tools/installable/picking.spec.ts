import { describe, expect, it } from "vitest";
import {
  pickingDistribution,
  pickingProgram,
  pickingWords as said,
} from "../../../tests/support/installable-picking.ts";
import { sampleOptions, sampleProgram } from "../../../tests/support/installable-program.ts";
import { programChecks } from "../../checks/program-checks.ts";
import { goTo, seated, type, view, type Seat } from "../../checks/promises/promised-keys.ts";
import { cast, perform, staged, type House } from "../../checks/promises/promised-stage.ts";
import { componer } from "../../runtime/distributions/compose.ts";
import { stacksOf } from "../../surface/menus/lists.ts";
import { distributionTexts as distribution } from "../../texts/distributions.texts.ts";
import { surfaceTexts as surface } from "../../texts/surface.texts.ts";
import { toolTexts as tools } from "../../texts/tools.texts.ts";
import type { Composition } from "../promises-contract.ts";
import type { Program } from "../tool-contract.ts";
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
const rowsAt = <X extends Program>(seat: Seat<X>, target?: string) =>
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
        expect(row()).toBeDefined();
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
        expect(question(seat)).toEqual({ ask: "Extra 1", options: [said.byHand, "Tornillo", "Tuerca"] });
        confirm(seat);
        expect(question(seat).ask).toBe(said.note);
        type(seat.router, "Arandela");
        confirm(seat);
        expect(question(seat).ask).toBe(said.more.ask);
        type(seat.router, said.more.another.key);
        expect(question(seat).ask).toBe("Extra 2");
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
describe("things named across the tools of one program", () => {
  it("opens the thing of another tool of the same program that a reading names", () =>
    staged(program, async ({ house }) => {
      await stock(house(), "Tornillo");
      await accepted(house(), {
        act: "orders/take",
        on: folder("orders"),
        input: { main: "1", extras: [{ note: "Arandela" }] },
      });
      const seat = seated(house(), cast.admin, shown);
      try {
        goTo(seat, "picking", thingOf("orders", "1"));
        const named = rowsAt(seat, thingOf("orders", "1")).find(each => each.title === "Tornillo");
        const item = thingOf("items", "1");
        expect(named).toMatchObject({ opens: item, open: { kind: "view", tool: "picking", target: item }, key: "1" });
        type(seat.router, "1");
        expect(seat.router.screen(view).title).toBe("Tornillo");
        expect(rowsAt(seat, item).find(each => each.title === "Nombre")).toMatchObject({ detail: "Tornillo" });
        const back = rowsAt(seat, item).find(each => each.title === said.order("1"));
        expect(back).toMatchObject({ opens: thingOf("orders", "1"), key: "1" });
        expect(seat.defects).toEqual([]);
      } finally {
        seat.router.stop();
      }
    }));
});
describe("what a reading names outside the tool that reads", () => {
  it("opens a thing of another program that a reading names by its full id", () => {
    const note = objectOf("notas", "personal", "same");
    const named = { other: { id: note, text: "Nota ajena" } };
    const beside = componer({ ...sampleOptions, programas: [pickingProgram({ named }), sampleProgram] });
    return staged(beside.program, async ({ house }) => {
      const added = await perform(house(), "picking", {
        act: "items/add",
        on: folder("items"),
        input: { name: "Uno" },
      });
      expect(added.status).toBe("accepted");
      const seat = seated(house(), cast.admin, beside.shown);
      try {
        goTo(seat, "picking", thingOf("items", "1"));
        const row = rowsAt(seat, thingOf("items", "1")).find(each => each.title === "Nota ajena");
        expect(row).toMatchObject({ opens: note, open: { kind: "view", tool: "notas", target: note } });
        type(seat.router, row?.key ?? "");
        expect(seat.router.screen(view).title).toBe("same");
        expect(seat.defects).toEqual([]);
      } finally {
        seat.router.stop();
      }
    });
  });
  /** Opens the first thing with a variant of the program whose readings add `named`, and calls `then` on it. */
  const reading = (
    named: Readonly<Record<string, unknown>>,
    then: (seat: Seat<Picking>, house: House<Picking>) => void,
  ) => {
    const { program, shown } = pickingDistribution({ named });
    return staged(program, async ({ house }) => {
      await stock(house(), "Tornillo");
      await accepted(house(), {
        act: "orders/take",
        on: folder("orders"),
        input: { main: "1", extras: [{ note: "A" }] },
      });
      const seat = seated(house(), cast.admin, shown);
      try {
        then(seat, house());
      } finally {
        seat.router.stop();
      }
    });
  };
  it.each([["nope"], [7]])("fails loud on a reading that names a thing of tool %j, which its program lacks", tool =>
    reading({ bogus: { id: "1", text: "Fantasma", tool } }, (seat, house) => {
      goTo(seat, "picking", thingOf("items", "1"));
      expect(seat.router.screen(view).title).toBe(surface.error);
      expect(seat.defects).toEqual([tools.defect("picking/picking")]);
      const told = house.journal.replay<string[]>([], (all, event) =>
        event.layer === "house" && event.kind === "tool-entry" ? [...all, event.data.diagnostic ?? ""] : all,
      );
      const bad = JSON.stringify(tool);
      expect(told.join("\n")).toContain(`picking/items names a thing under bogus of tool ${bad}, which is not a tool`);
    }),
  );
  it("opens what a reading names inside, also when the reading carries an id of its own", () =>
    reading({ id: "1" }, seat => {
      goTo(seat, "picking", thingOf("items", "1"));
      const named = rowsAt(seat, thingOf("items", "1")).find(each => each.title === said.order("1"));
      expect(named).toMatchObject({ opens: thingOf("orders", "1"), key: "1" });
      type(seat.router, named?.key ?? "");
      expect(seat.router.screen(view).title).toBe(said.order("1"));
      expect(seat.defects).toEqual([]);
    }));
});
describe("what a tool itself needs", () => {
  it("lists a need on the folder of a tool in Attention, on a row that opens the tool", () =>
    staged(program, async ({ house }) => {
      const seat = seated(house(), cast.admin, shown);
      const needs = (tool?: string) =>
        stacksOf(tool === undefined ? { kind: "menu", at: 0 } : { kind: "view", tool, at: 0 }, seat.tools)
          .find(stack => stack.title === surface.attentionList)
          ?.rows.filter(row => row.open?.kind === "view" && row.open.tool === "picking");
      try {
        const row = { title: "Pedidos", detail: said.pending, opens: folder("orders") };
        const open = { kind: "view", tool: "picking", target: folder("orders") };
        expect(needs()).toMatchObject([{ ...row, open }]);
        expect(needs("picking")).toMatchObject([{ ...row, open }]);
        type(seat.router, needs()?.[0]?.key ?? "");
        expect(seat.router.screen(view).title).toBe("Pedidos");
        expect(rowsAt(seat, folder("orders")).some(each => each.starts?.act === "orders/take")).toBe(true);
        await stock(house(), "Tornillo");
        const input = { main: "1", extras: [{ note: "Arandela" }] };
        await accepted(house(), { act: "orders/take", on: folder("orders"), input });
        expect([needs(), needs("picking")]).toEqual([[], []]);
        expect(seat.defects).toEqual([]);
      } finally {
        seat.router.stop();
      }
    }));
});
describe("the tools a program holds", () => {
  it("lists every tool of the program on its own row in the stack of its tools", () =>
    staged(program, async ({ house }) => {
      await stock(house(), "Tornillo");
      await accepted(house(), {
        act: "orders/take",
        on: folder("orders"),
        input: { main: "1", extras: [{ note: "A" }] },
      });
      const seat = seated(house(), cast.admin, shown);
      try {
        const listed = stacksOf({ kind: "view", tool: "picking", at: 0 }, seat.tools).find(
          stack => stack.title === distribution.groups,
        );
        expect(listed?.rows.map(row => [row.title, row.opens])).toEqual([
          ["Cosas", folder("items")],
          ["Pedidos", folder("orders")],
          ["Extras", folder("extras")],
        ]);
        /** Its row opens it, and it lists its things as the others do. */
        goTo(seat, "picking", folder("extras"));
        expect(rowsAt(seat, folder("extras")).map(row => row.opens)).toContain(thingOf("extras", "1.1"));
        expect(seat.defects).toEqual([]);
      } finally {
        seat.router.stop();
      }
    }));
});
