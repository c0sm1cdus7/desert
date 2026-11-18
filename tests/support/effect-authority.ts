// Effects returned by a real action, with the same house and journal used by the shop.
import { mindEffects } from "./mind-facts.ts";
import { deviceEffects } from "./device-effects.ts";
import { object } from "../../src/fields/visible-text.ts";
import { effect, type HouseKind } from "../../src/house/facts.ts";
import type { Emission } from "../../src/journal/vocabulary.ts";
import { toolAct } from "../../src/tools/act-definition.ts";
import type { ActContext, ActResult, Tool } from "../../src/tools/tool-contract.ts";
import { shopRig } from "./shop-rig.ts";
import { salesTool, paymentsTool, type Shop } from "./shop.ts";
export const nothing = object({});
const ruleEffects = (by: string) =>
  [
    effect(
      "rule-versioned",
      {
        definition: {
          id: "forged",
          text: "Regla inventada",
          action: { tool: "sales", act: "register" },
          condition: { operator: "actor", kind: "identity" },
          effect: "frena",
        },
        version: 1,
        previous: null,
      },
      by,
    ),
    effect("rule-approved", { id: "forged", version: 1 }, by),
    effect("rule-retired", { id: "forged", version: 1 }, by),
    effect("rule-evaluated", { action: { tool: "sales", act: "register" }, results: [] }, by),
  ] satisfies readonly Emission[];
export const houseEffects = (by: string) =>
  [
    ...mindEffects(by),
    ...ruleEffects(by),
    ...deviceEffects(by),
    effect("door-key-issued", { id: "forged", identity: "beto", door: "agente", fingerprint: "0".repeat(64) }, by),
    effect("door-key-revoked", { key: "forged" }, by),
    effect(
      "door-invitation-issued",
      { id: "forged", identity: "beto", door: "agente", fingerprint: "0".repeat(64), expires: 1 },
      by,
    ),
    effect("door-invitation-redeemed", { invitation: "forged", key: "forged" }, by),
    effect("house-created", {}, by),
    effect("granted", { identity: "beto", tools: ["sales", "payments"] }, by),
    effect("named", { identity: "beto", name: "Otro nombre" }, by),
    effect("removed", { identity: "beto" }, by),
    effect("handed", { to: "beto" }, by),
    effect("preferred", { hide: "empty", on: true }, by),
    effect("scene", { general: "Otra escena" }, by),
    effect("kit-set", { holder: "beto", tool: "sales", acts: null }, by),
    effect("boot", {}, by),
    effect("act", { object: "sales", option: "register", input: {} }, by),
    effect("act-started", { act: "inventado", object: "sales", option: "register" }, by),
    effect("act-result", { act: "inventado", status: "accepted", reason: "" }, by),
    effect("tool-entry", { tool: "sales", target: "sales", author: by, text: "Inventado" }, by),
    effect("act-done", { object: "sales", act: "register", text: "Inventado" }, by),
    effect("attended", { target: "payments" }, by),
    effect("unattended", { target: "sales" }, by),
    effect("attention", { tool: "payments", delay: null }, by),
    effect("stimulus", { tool: "payments" }, by),
    effect("wake-at", { id: "payments:ajeno", at: null }, by),
    effect("woke", { id: "payments:ajeno" }, by),
  ] satisfies readonly Emission[];
export const houseKinds: readonly HouseKind[] = houseEffects("ana").map(each => each.kind);
export function effectRig(
  run: (context: ActContext<Shop>) => ActResult<Shop> | Promise<ActResult<Shop>>,
  core = false,
) {
  const id = core ? "identities" : "sales";
  const tool: Tool<Shop> = Object.assign(
    { ...salesTool, id, targets: () => (core ? ["identities/ana", "identities/beto"] : []) },
    { facts: core ? [] : (["sale-registered", "sale-corrected"] as const) },
    {
      acts: {
        forge: toolAct<Shop, typeof nothing>(nothing, (_, context) => run(context)),
        /** The one core action a member runs on its own row; the effects stay the test's. */
        scene: toolAct<Shop, typeof nothing>(nothing, (_, context) => run(context)),
        other: toolAct<Shop, typeof nothing>(nothing, () => ({
          status: "accepted",
          text: "Otra",
        })),
      },
    },
  );
  const rig = shopRig({
    registry: core ? [salesTool, paymentsTool, tool] : [tool, paymentsTool],
    grants: { ana: [id, "payments"], beto: ["sales"] },
    identities: core,
  });
  for (const by of ["ana", "beto"]) rig.attend(by, id);
  rig.bus.emit(effect("kit-set", { holder: "beto", tool: "sales", acts: ["forge"] }, "ana"));
  rig.bus.emit(effect("kit-set", { holder: "mind:sales", tool: "sales", acts: ["forge"] }, "ana"));
  return rig;
}
