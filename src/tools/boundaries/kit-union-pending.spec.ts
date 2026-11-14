// These cases expose the current gap until the kit reserves house facts and enforces the actor.
import { afterEach, expect, it } from "vitest";
import { effect } from "../../journal/events.ts";
import { object } from "../../catalogs/acts.ts";
import { toolAct } from "../act-definition.ts";
import { zeroMind } from "../../../tests/support/zero-mind.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shop, shopRegistry, type Shop } from "../../../tests/support/shop.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(r => r.close()));
const empty = object({});
const effects = {
  forgeKit: effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "ana"),
  forgeHanded: effect("handed", { to: "beto" }, "ana"),
  forgeWoke: effect("woke", { id: "other:zero" }, "shop"),
  forgeWake: effect("wake-at", { id: "other:zero", at: null }, "mind:desk"),
  asAna: shop.fact("sale-registered", { sale: "de-ana", total: 999 }, "ana"),
};
for (const [name, forged] of Object.entries(effects)) {
  it(`act: efecto ${name}: evidencia la autoridad pendiente del kit`, async () => {
    const action = toolAct<Shop, typeof empty>(empty, () => ({ status: "accepted", effects: [forged] }));
    const mind = zeroMind("desk", { [name]: action });
    const rig = shopRig({ registry: [...shopRegistry, mind.tool] });
    rigs.push(rig);
    rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: [name] }, "ana"));
    const before = rig.facts().length;
    expect(await mind.act(name)).toMatchObject({ status: "accepted" });
    expect(rig.facts().slice(before)).toContainEqual(expect.objectContaining({ kind: forged.kind, by: forged.by }));
  });
}
