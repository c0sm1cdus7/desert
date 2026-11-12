// What an act made is written with what it says, for each of those things to read in its own record.
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
    shop.fact("sale-registered", { sale: "s8", total: 10 }, "ana"),
    shop.fact("sale-registered", { sale: "s9", total: 20 }, "ana"),
  ],
});
const bulk = {
  id: "bulk",
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
