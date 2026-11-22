import { holderKit } from "../house/kit-history.ts";
import { afterEach, expect, it } from "vitest";
import { effect } from "../house/facts.ts";
import { settle } from "../surface/bridge/ports/house-ports.ts";
import { toolAct } from "../tools/act-definition.ts";
import { effectRig, nothing } from "../../tests/support/effect-authority.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shop, salesTool, paymentsTool } from "../../tests/support/shop.ts";
const rigs: { close(): void }[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
it("a program's core mark does not enable house facts", async () => {
  const tool = Object.assign({}, salesTool, {
    core: true,
    acts: {
      forge: toolAct(nothing, (_, { by }) => ({
        status: "accepted",
        effects: [effect("kit-set", { holder: "beto", tool: "sales", acts: null }, by)],
      })),
    },
  });
  const rig = shopRig({ registry: [tool, paymentsTool], identities: true });
  rigs.push(rig);
  rig.attend("ana", "sales");
  expect(await settle(rig.act("ana", "forge", {}, "sales"))).toMatchObject({ status: "rejected", effects: [] });
});
it("a fact with no declared owner is not written", async () => {
  const rig = shopRig({ registry: [{ ...salesTool, facts: [] }, paymentsTool] });
  rigs.push(rig);
  rig.attend("ana", "sales");
  expect(await settle(rig.act("ana", "register", { sale: "s1", total: 1 }, "sales"))).toMatchObject({
    status: "rejected",
    effects: [],
  });
});
it("a core batch is validated in order and whole: grant and kit yes, removal and kit no", async () => {
  for (const remove of [false, true]) {
    const rig = effectRig(
      ({ by }) => ({
        status: "accepted",
        effects: [
          remove
            ? effect("removed", { identity: "beto" }, by)
            : effect("granted", { identity: "carla", tools: ["sales"] }, by),
          effect("kit-set", { holder: remove ? "beto" : "carla", tool: "sales", acts: ["register"] }, by),
        ],
      }),
      true,
    );
    rigs.push(rig);
    const before = rig.state().house;
    const result = await settle(rig.act("ana", "forge", {}, "identities"));
    expect(result.status).toBe(remove ? "rejected" : "accepted");
    if (remove) expect(rig.state().house).toEqual(before);
    else
      expect(holderKit(rig.state().house, "carla").selections).toEqual([
        { kind: "action", program: "sales", tool: "sales", action: "register" },
      ]);
  }
});
it("handing over administration inside the batch does not allow granting further", async () => {
  const rig = effectRig(
    ({ by }) => ({
      status: "accepted",
      effects: [effect("handed", { to: "beto" }, by), effect("granted", { identity: "carla", tools: [] }, by)],
    }),
    true,
  );
  rigs.push(rig);
  expect(await settle(rig.act("ana", "forge", {}, "identities"))).toMatchObject({ status: "rejected", effects: [] });
  expect(rig.state().house.admin).toBe("ana");
});
it("the core does not forge an entry's author", async () => {
  const rig = effectRig(
    ({ by }) => ({
      status: "accepted",
      effects: [
        effect(
          "tool-entry",
          {
            tool: "identities",
            target: "identities",
            author: "beto",
            text: "Forjada",
          },
          by,
        ),
      ],
    }),
    true,
  );
  rigs.push(rig);
  expect(await settle(rig.act("ana", "forge", {}, "identities"))).toMatchObject({ status: "rejected", effects: [] });
});
it("authority does not mix up two pending acts of the same tool", async () => {
  const releases: (() => void)[] = [];
  const rig = effectRig(async ({ by }) => {
    await new Promise<void>(resolve => releases.push(resolve));
    return { status: "accepted", effects: [shop.fact("sale-registered", { sale: by, total: 1 }, by)] };
  });
  rigs.push(rig);
  const first = rig.act("beto", "forge", {}, "sales");
  const second = rig.act("mind:sales", "forge", {}, "sales");
  releases.reverse().forEach(release => release());
  expect((await settle(second)).status).toBe("accepted");
  expect((await settle(first)).status).toBe("accepted");
  expect([...rig.state().tools.sales.values()].map(sale => sale.by).sort()).toEqual(["beto", "mind:sales"]);
});
it("the new rejection does not rewrite historical facts", () => {
  const rig = effectRig(() => ({ status: "accepted" }));
  rigs.push(rig);
  rig.bus.emit(effect("kit-set", { holder: "beto", tool: "sales", acts: ["phantom"] }, "ana"));
  rig.bus.emit(shop.fact("payment-received", { payment: "old", amount: 100 }, "mind:sales"));
  const before = rig.facts();
  rig.restart();
  expect(rig.facts()).toEqual(before);
  expect(holderKit(rig.state().house, "beto").selections).toContainEqual({
    kind: "action",
    program: "sales",
    tool: "sales",
    action: "phantom",
  });
  expect(rig.state().tools.payments.received).toBe(100);
});
it("a nonexistent core mind does not get the identity exception", async () => {
  const rig = effectRig(() => ({ status: "accepted" }), true);
  rigs.push(rig);
  expect((await settle(rig.act("mind:identities", "forge", {}, "identities"))).status).toBe("rejected");
});
it("the reserved id needs the composition to request the core", async () => {
  const rig = shopRig({
    registry: [
      salesTool,
      paymentsTool,
      {
        ...salesTool,
        id: "identities",
        facts: [],
        acts: {
          forge: toolAct(nothing, (_, { by }) => ({
            status: "accepted",
            effects: [effect("granted", { identity: "carla", tools: [] }, by)],
          })),
        },
      },
    ],
    own: () => [],
  });
  rigs.push(rig);
  rig.attend("ana", "identities");
  expect((await settle(rig.act("ana", "forge", {}, "identities"))).status).toBe("rejected");
  expect(rig.state().house.grants.has("carla")).toBe(false);
});
