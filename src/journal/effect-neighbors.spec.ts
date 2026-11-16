import { afterEach, expect, it } from "vitest";
import { effect } from "../house/facts.ts";
import { settle } from "../surface/bridge/ports/house-ports.ts";
import { toolAct } from "../tools/act-definition.ts";
import { effectRig, nothing } from "../../tests/support/effect-authority.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shop, salesTool, paymentsTool } from "../../tests/support/shop.ts";
const rigs: { close(): void }[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
it("una marca core del programa no habilita hechos de la casa", async () => {
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
it("un hecho sin dueño declarado no se escribe", async () => {
  const rig = shopRig({ registry: [{ ...salesTool, facts: [] }, paymentsTool] });
  rigs.push(rig);
  rig.attend("ana", "sales");
  expect(await settle(rig.act("ana", "register", { sale: "s1", total: 1 }, "sales"))).toMatchObject({
    status: "rejected",
    effects: [],
  });
});
it("un lote del core se valida en orden y entero: alta y kit sí, baja y kit no", async () => {
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
    else expect(rig.state().house.kits.get("carla")?.get("sales")).toEqual(["register"]);
  }
});
it("pasar la administración dentro del lote no habilita seguir dando", async () => {
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
it("el core no falsifica el autor de una entrada", async () => {
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
it("la autoridad no mezcla dos actos pendientes de la misma herramienta", async () => {
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
it("el rechazo nuevo no reescribe hechos históricos", () => {
  const rig = effectRig(() => ({ status: "accepted" }));
  rigs.push(rig);
  rig.bus.emit(effect("kit-set", { holder: "beto", tool: "sales", acts: ["fantasma"] }, "ana"));
  rig.bus.emit(shop.fact("payment-received", { payment: "viejo", amount: 100 }, "mind:sales"));
  const before = rig.facts();
  rig.restart();
  expect(rig.facts()).toEqual(before);
  expect(rig.state().house.kits.get("beto")?.get("sales")).toEqual(["fantasma"]);
  expect(rig.state().tools.payments.received).toBe(100);
});
it("una mente de core inexistente no recibe la excepción de identidad", async () => {
  const rig = effectRig(() => ({ status: "accepted" }), true);
  rigs.push(rig);
  expect((await settle(rig.act("mind:identities", "forge", {}, "identities"))).status).toBe("rejected");
});
it("el identificador reservado necesita que la composición pida el core", async () => {
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
