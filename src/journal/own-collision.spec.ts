import { effect } from "../house/facts.ts";
import { settle } from "../surface/bridge/ports/house-ports.ts";
import { afterEach, expect, it } from "vitest";
import { ownAct } from "../tools/act-definition.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shop, salesTool, paymentsTool, type Shop } from "../../tests/support/shop.ts";
import { nothing } from "../../tests/support/effect-authority.ts";
const rigs: { close(): void }[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const own = (target: string, option: string) =>
  ownAct<Shop, typeof nothing>(target, option, { input: nothing, purpose: "Acto propio" }, (_, { by }) => ({
    status: "accepted",
    effects: [shop.fact("sale-registered", { sale: "own", total: 1 }, by)],
  }));
it.each(["sales", "sales/s1"])("R6: composing fails on the register collision over %s", target => {
  expect(() => {
    const rig = shopRig({
      registry: [{ ...salesTool, targets: () => ["sales/s1"] }, paymentsTool],
      own: () => [own(target, "register")],
    });
    rigs.push(rig);
  }).toThrow(/register.*sales|sales.*register/);
});
it("does not confuse the same name on another tool or another action", () => {
  const rig = shopRig({ own: () => [own("payments", "register"), own("sales", "mine")] });
  rigs.push(rig);
  expect(rig.act("ana", "mine", {}, "sales").status).toBe("accepted");
});
it("a program cannot reserve another tool's fact", () => {
  expect(() => {
    const rig = shopRig({
      registry: [
        Object.assign({}, salesTool, { facts: ["sale-registered"] as const }),
        Object.assign({}, paymentsTool, { facts: ["sale-registered"] as const }),
      ],
    });
    rigs.push(rig);
  }).toThrow(/sale-registered/);
});
it("a program's own act on identities does not become a core act", async () => {
  const rig = shopRig({
    identities: true,
    registry: [salesTool, paymentsTool, { ...salesTool, id: "identities", facts: [] }],
    own: () => [
      ownAct<Shop, typeof nothing>(
        "identities",
        "administer",
        {
          input: nothing,
          purpose: "Propio del programa",
        },
        (_, { by }) => ({
          status: "accepted",
          effects: [effect("granted", { identity: "carla", tools: ["sales"] }, by)],
        }),
      ),
    ],
  });
  rigs.push(rig);
  const result = await settle(rig.act("ana", "administer", {}, "identities"));
  expect(result).toMatchObject({ status: "rejected", effects: [] });
  expect(rig.state().house.grants.has("carla")).toBe(false);
});
it("a declaration cannot take over a fact reserved for the house", () => {
  expect(() => {
    const rig = shopRig({ registry: [Object.assign({}, salesTool, { facts: ["granted"] }), paymentsTool] });
    rigs.push(rig);
  }).toThrow(/granted.*casa/);
});
