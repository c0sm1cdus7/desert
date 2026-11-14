import { effect } from "../journal/events.ts";
import { settle } from "../surface/bridge/house-ports.ts";
import { afterEach, expect, it } from "vitest";
import { ownAct } from "./act-definition.ts";
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
it.each(["sales", "sales/s1"])("R6: falla al componer la colisión register sobre %s", target => {
  expect(() => {
    const rig = shopRig({
      registry: [{ ...salesTool, targets: () => ["sales/s1"] }, paymentsTool],
      own: () => [own(target, "register")],
    });
    rigs.push(rig);
  }).toThrow(/register.*sales|sales.*register/);
});
it("no confunde el mismo nombre sobre otra herramienta ni otra acción", () => {
  const rig = shopRig({ own: () => [own("payments", "register"), own("sales", "propia")] });
  rigs.push(rig);
  expect(rig.act("ana", "propia", {}, "sales").status).toBe("accepted");
});
it("un programa no puede reservar un hecho de otra herramienta", () => {
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
it("un own de programa sobre identities no se vuelve un acto del core", async () => {
  const rig = shopRig({
    identities: true,
    registry: [salesTool, paymentsTool, { ...salesTool, id: "identities", facts: [] }],
    own: () => [
      ownAct<Shop, typeof nothing>(
        "identities",
        "administrar",
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
  const result = await settle(rig.act("ana", "administrar", {}, "identities"));
  expect(result).toMatchObject({ status: "rejected", effects: [] });
  expect(rig.state().house.grants.has("carla")).toBe(false);
});
it("una declaración no puede apropiarse de un hecho reservado de la casa", () => {
  expect(() => {
    const rig = shopRig({ registry: [Object.assign({}, salesTool, { facts: ["granted"] }), paymentsTool] });
    rigs.push(rig);
  }).toThrow(/granted.*casa/);
});
