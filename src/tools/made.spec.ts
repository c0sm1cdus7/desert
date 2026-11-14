// What an act made is written with what it says, for each of those things to read in its own record.
import { toolTexts } from "../texts/tools.texts.ts";
import { Type } from "@sinclair/typebox";
import { afterEach, describe, expect, it } from "vitest";
import { toolAct } from "./act-definition.ts";
import type { ActResult } from "./tool-contract.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shop, shopRegistry, type Shop } from "../../tests/support/shop.ts";

type Result = ActResult<Shop>;
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const nothing = Type.Object({});
/** A tool with no things of its own, whose one act registers two sales at once. */
const pair = (): Result => ({
  status: "accepted",
  text: "Registradas · 2",
  effects: [
    shop.fact("batch-sale-registered", { sale: "s8", total: 10 }, "ana"),
    shop.fact("batch-sale-registered", { sale: "s9", total: 20 }, "ana"),
  ],
});
const bulk = {
  id: "bulk",
  facts: ["batch-sale-registered"] as const,
  purpose: "A tool of the test.",
  targets: () => [],
  view: () => "",
  summary: () => "",
  acts: { run: toolAct(nothing, pair) },
};
const open = () => {
  const rig = shopRig({ registry: [...shopRegistry, bulk] });
  rigs.push(rig);
  for (const target of ["bulk", "sales"]) rig.attend("ana", target);
  return rig;
};

describe("what an act made", () => {
  it("is written with what the act says: every thing that was not there before it, besides its own target", () => {
    const rig = open();
    expect(rig.act("ana", "run", {}, "bulk").status).toBe("accepted");
    const said = rig.state().entries.at(-1)?.data;
    expect(said).toMatchObject({ target: "bulk", text: "Registradas · 2", made: ["sales/s8", "sales/s9"] });
    /** An act that makes only the thing it says it was done to adds nothing. */
    expect(rig.act("ana", "register", { sale: "s1", total: 5 }, "sales").status).toBe("accepted");
    expect(rig.state().entries.at(-1)?.data).toMatchObject({ target: "sales/s1" });
    expect(rig.state().entries.at(-1)?.data.made).toBeUndefined();
  });
});

describe("what an act writes", () => {
  it("is written whole or not at all: a fact that does not fold refuses the act, saying why, and nothing stays", () => {
    const rig = open();
    /** Something that folds every fact of the house and does not take the sale called s9. */
    rig.journal.watch("guard", 0, (count: number, event) => {
      if (event.kind === "batch-sale-registered" && event.data.sale === "s9") throw new Error("s9 no se pliega");
      return count + 1;
    });
    const done = rig.act("ana", "run", {}, "bulk");
    expect(done).toMatchObject({ status: "rejected", reason: toolTexts.baseFailure, defect: true });
    expect(done.effects).toHaveLength(1);
    expect(JSON.stringify(rig.state().entries)).toContain("s9 no se pliega");
    expect([...rig.state().tools.sales.keys()]).toEqual([]);
    expect(rig.state().entries.some(entry => entry.data.text === "Registradas · 2")).toBe(false);
    expect(rig.facts().at(-1)).toMatchObject({ kind: "act-result", data: { status: "rejected" } });
    /** The house goes on: the same tool registers what does fold. */
    expect(rig.act("ana", "register", { sale: "s1", total: 5 }, "sales").status).toBe("accepted");
  });
});

describe("an act that cannot be done yet", () => {
  it("is asked whether it is offered knowing the moment: off until its day, with its cause, then done", () => {
    let opens = Number.POSITIVE_INFINITY;
    const asked: number[] = [];
    const offered = (_state: unknown, _target: string, at: number) => {
      asked.push(at);
      return at < opens ? "todavía no empezó" : undefined;
    };
    const timed = { ...bulk, id: "timed", acts: { run: { ...toolAct(nothing, pair), offered } } };
    const rig = shopRig({ registry: [...shopRegistry, timed] });
    rigs.push(rig);
    for (const target of ["timed", "sales"]) rig.attend("ana", target);
    const before = Date.now();
    expect(rig.act("ana", "run", {}, "timed")).toMatchObject({ status: "rejected", reason: "todavía no empezó" });
    expect(asked.every(at => at >= before && at <= Date.now())).toBe(true);
    opens = before;
    expect(rig.act("ana", "run", {}, "timed").status).toBe("accepted");
  });
});
