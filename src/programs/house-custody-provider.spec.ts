import "../../tests/support/fixture-vault.ts";
import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { custodyRig } from "../../tests/support/custody-rig.ts";
import { shop, shopRegistry, shopSlices, type Shop } from "../../tests/support/shop.ts";
import { startHouse } from "./house-runtime.ts";
import { toolAct } from "../tools/act-definition.ts";
it("p9: una acción propia secreta ofrecida más tarde dice que falta secretKeys", () => {
  let offered = false;
  const input = Type.Object({ value: Type.String({ secret: true }) });
  const house = startHouse(custodyRig().home, {
    by: "ana",
    projectionVersion: "shop/1",
    words: shop,
    slices: shopSlices,
    registry: shopRegistry,
    creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["sales"] }] },
    own: () =>
      offered
        ? [
            {
              ...toolAct<Shop, typeof input>(input, () => ({ status: "accepted" })),
              object: "own",
              option: "set",
              purpose: "Inventado",
            },
          ]
        : [],
  });
  try {
    offered = true;
    expect(() => house.tools.act({ act: "set", target: "own", input: { value: "inventado" } }, 0, "ana")).toThrow(
      /E-CUSTODY-PROVIDER.*secretKeys/u,
    );
  } finally {
    house.close();
  }
});
