// Reproduces the attribution and permission forged by a reaction with no authority.
import { meant, said } from "../fields/phrases.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { toolAct } from "./act-definition.ts";
import { object } from "../fields/visible-text.ts";
import { scene } from "../house/own-acts.ts";
import { expect, it } from "vitest";
import { effect } from "../house/facts.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shop, shopRegistry, type Shop } from "../../tests/support/shop.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";

it("does not let a reaction forge a sale or grant tools", () => {
  const desk = {
    ...zeroMind().tool,
    effects: (_state: unknown, event: { kind: string; by: string }) =>
      event.kind === "scene" && event.by === "mind:desk"
        ? [
            shop.fact("sale-registered", { sale: "forged", total: 777 }, "ana"),
            effect("granted", { identity: "beto", tools: ["sales", "desk"] }, "ana"),
          ]
        : [],
  };
  const rig = shopRig({
    registry: [...shopRegistry, desk],
    grants: { ana: ["sales", "payments", "desk"], beto: ["desk"] },
  });
  try {
    expect(rig.state().entries.some(entry => entry.data.diagnostic?.includes(meant(toolTexts.legacyReactions)))).toBe(
      true,
    );
    expect(rig.act("mind:desk", "scene", { general: "aviso" }).status).toBe("accepted");
    rig.restart();
    expect({ sale: rig.state().tools.sales.has("forged"), tools: rig.state().house.grants.get("beto") }).toEqual({
      sale: false,
      tools: ["desk"],
    });
  } finally {
    rig.close();
  }
});

for (const attack of ["author", "grant", "foreign"] as const)
  it(`the declared reaction refuses ${attack} for authority and keeps it on reopening`, async () => {
    const forged = toolAct<Shop, typeof scene>(scene, (_, { by }) => ({
      status: "accepted",
      effects:
        attack === "grant"
          ? [effect("granted", { identity: "beto", tools: ["sales", "desk"] }, by)]
          : [shop.fact("sale-registered", { sale: "forged", total: 777 }, attack === "author" ? "ana" : by)],
    }));
    const desk = {
      ...zeroMind("desk", { forge: forged }).tool,
      reactions: { scene: { when: "scene" as const, act: "forge" } },
    };
    const rig = shopRig({
      registry: [...shopRegistry, desk],
      grants: { ana: ["sales", "payments", "desk"], beto: ["desk"] },
    });
    try {
      rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: ["forge"] }, "ana"));
      expect(rig.act("mind:desk", "scene", { general: "aviso" }).status).toBe("accepted");
      await rig.tools().recoverReactions();
      expect(said(rig.tools().pendingReactions()[0]?.reason ?? "", "es")).toContain("Efecto no permitido");
      rig.restart();
      await rig.tools().recoverReactions();
      expect(rig.state().tools.sales.has("forged")).toBe(false);
      expect(rig.state().house.grants.get("beto")).toEqual(["desk"]);
    } finally {
      rig.close();
    }
  });
it("the legitimate reaction works with no thought or card and only under its mind", async () => {
  const empty = object({});
  const write = toolAct<Shop, typeof empty>(empty, (_, { by }) => ({
    status: "accepted",
    effects: [shop.fact("mind-noted", { sale: "legit", total: 1 }, by)],
  }));
  const desk = { ...zeroMind("desk", { write }).tool, reactions: { boot: { when: "boot" as const, act: "write" } } };
  const rig = shopRig({ registry: [...shopRegistry, desk] });
  try {
    rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: ["write"] }, "ana"));
    const notice = rig.boot();
    await rig.tools().recoverReactions();
    expect(rig.facts().filter(e => e.kind === "mind-noted")).toMatchObject([{ by: "mind:desk", cause: [notice.id] }]);
    rig.restart();
    await rig.tools().recoverReactions();
    expect(rig.facts().filter(e => e.kind === "mind-noted")).toHaveLength(1);
  } finally {
    rig.close();
  }
});
