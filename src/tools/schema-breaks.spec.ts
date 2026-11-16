// What a declaration refuses beyond its schema: a quantity carries no more decimals than a person can write.
import { describe, expect, it } from "vitest";
import { object } from "../fields/visible-text.ts";
import { fine, quantity } from "../fields/fields.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../tests/support/shop.ts";
import { toolAct } from "./act-definition.ts";
import { outsideOf } from "./schema-breaks.ts";
import type { Tool } from "./tool-contract.ts";

const weighed = object({ quantity: quantity("Cantidad") });
const scale: Tool<Shop> = {
  id: "scale",
  purpose: "A tool of the test.",
  targets: () => [],
  view: () => "",
  summary: () => "",
  acts: { weigh: toolAct(weighed, () => ({ status: "accepted" })) },
};

describe("a quantity", () => {
  it("holds with up to three decimals, and not with more", () => {
    expect([1, 1.5, 0.001, 999_999].map(quantity => fine(weighed, { quantity }))).toEqual([true, true, true, true]);
    expect([0.0001, 2.0005, 1.23456].map(quantity => fine(weighed, { quantity }))).toEqual([false, false, false]);
  });

  it("is broken, for every act that takes one, by a decimal more than it carries", () => {
    expect(outsideOf(weighed, { quantity: 2 })).toContainEqual({ quantity: 2.0001 });
  });

  it("is refused as invalid by the act itself when it comes finer than a person can write it", () => {
    const rig = shopRig({ registry: [...shopRegistry, scale] });
    rig.attend("ana", "scale");
    expect(rig.act("ana", "weigh", { quantity: 1.5 }, "scale").status).toBe("accepted");
    const finer = rig.act("ana", "weigh", { quantity: 1.5001 }, "scale");
    expect(finer).toMatchObject({ status: "rejected", reason: toolTexts.invalid });
    rig.close();
  });
});
