import { afterEach, expect, it } from "vitest";
import { effect } from "../house/facts.ts";
import type { Emission } from "./facts.ts";
import { settle } from "../surface/bridge/ports/house-ports.ts";
import { toolAct } from "../tools/act-definition.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { nothing } from "../../tests/support/effect-authority.ts";
import { shop, salesTool, paymentsTool, type Shop } from "../../tests/support/shop.ts";
const rigs: { close(): void }[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
it("la validación incluye lo que cambia el rechazo tardío del programa", async () => {
  const effects: Emission<Shop["fact"]>[] = [shop.fact("sale-registered", { sale: "propia", total: 1 }, "ana")];
  const forge = {
    ...toolAct<Shop, typeof nothing>(nothing, () => ({ status: "accepted", effects })),
    reject: () => {
      effects.push(effect("handed", { to: "beto" }, "ana"));
      return undefined;
    },
  };
  const rig = shopRig({ registry: [{ ...salesTool, acts: { forge } }, paymentsTool] });
  rigs.push(rig);
  rig.attend("ana", "sales");
  expect(await settle(rig.act("ana", "forge", {}, "sales"))).toMatchObject({ status: "rejected", effects: [] });
  expect(rig.state().house.admin).toBe("ana");
  expect(rig.state().tools.sales.size).toBe(0);
});
