// The kit's authority reaches the mind: an effect with another author, a house fact or another tool's fact rejects
// the whole batch in view and writes nothing; the mind's own declared fact is written under its name.
import { afterEach, expect, it } from "vitest";
import { effect } from "../house/facts.ts";
import type { Emission } from "./facts.ts";
import { object } from "../fields/visible-text.ts";
import { effectRefusalTexts as why, toolTexts } from "../texts/tools.texts.ts";
import { toolAct } from "../tools/act-definition.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shop, shopRegistry, type Shop, type ShopFact } from "../../tests/support/shop.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(r => r.close()));
const empty = object({});
type Forged = readonly [Emission<ShopFact>, string];
const forged: Readonly<Record<string, Forged>> = {
  // The five cases the mind left pending until the kit joined it.
  forgeKit: [effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "ana"), why.otherAuthor],
  forgeHanded: [effect("handed", { to: "beto" }, "ana"), why.otherAuthor],
  forgeWoke: [effect("woke", { id: "other:zero" }, "shop"), why.otherAuthor],
  forgeWake: [effect("wake-at", { id: "other:zero", at: null }, "mind:desk"), why.houseFact],
  asAna: [shop.fact("sale-registered", { sale: "de-ana", total: 999 }, "ana"), why.otherAuthor],
  // Neighbours: the same house facts under the mind's own name, and another tool's fact under its name.
  ownKit: [effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "mind:desk"), why.houseFact],
  ownHanded: [effect("handed", { to: "beto" }, "mind:desk"), why.houseFact],
  ownWoke: [effect("woke", { id: "desk:zero" }, "mind:desk"), why.houseFact],
  otherTool: [shop.fact("sale-registered", { sale: "ajena", total: 1 }, "mind:desk"), why.otherTool],
};
function opened(name: string, effects: readonly Emission<ShopFact>[]) {
  const action = toolAct<Shop, typeof empty>(empty, () => ({ status: "accepted", effects: [...effects] }));
  const mind = zeroMind("desk", { [name]: action });
  const rig = shopRig({ registry: [...shopRegistry, mind.tool] });
  rigs.push(rig);
  rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: [name] }, "ana"));
  return { mind, rig };
}
for (const [name, [fact, reason]] of Object.entries(forged)) {
  it(`act: efecto ${name}: la autoridad del kit lo rechaza a la vista y no escribe nada`, async () => {
    const own = shop.fact("mind-noted", { sale: "junto", total: 1 }, "mind:desk");
    const { mind, rig } = opened(name, [own, fact]);
    const before = rig.facts().length;
    const house = rig.state().house;
    expect(await mind.act(name)).toEqual({ status: "rejected", reason: toolTexts.effectRefused(fact.kind, reason) });
    const written = rig.facts().slice(before);
    expect(written.filter(e => e.kind === fact.kind)).toEqual([]);
    expect(written.filter(e => e.kind === "mind-noted")).toEqual([]);
    expect(rig.state().house).toEqual(house);
    expect(rig.state().tools.sales.size).toBe(0);
  });
}
it("act: el hecho propio declarado de la mente se escribe a su nombre", async () => {
  const own = shop.fact("mind-noted", { sale: "propia", total: 1 }, "mind:desk");
  const { mind, rig } = opened("own", [own]);
  expect(await mind.act("own")).toEqual({ status: "accepted" });
  expect(rig.facts().filter(e => e.kind === "mind-noted")).toEqual([
    expect.objectContaining({ by: "mind:desk", data: { sale: "propia", total: 1 } }),
  ]);
  expect(rig.state().tools.sales.get("propia")?.by).toBe("mind:desk");
});
