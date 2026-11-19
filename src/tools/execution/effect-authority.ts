// Validate the complete returned batch before the engine adds its own execution facts.
import { isMindActor } from "../../fields/mind-actor.ts";
import { MindContractError } from "../../fields/mind-errors.ts";
import { layerOf, type HouseEmission } from "../../house/facts.ts";
import { storedHolderKit } from "../../house/kit-history.ts";
import { selectionKit, selectionPath } from "../../house/kit-selection.ts";
import { selectionProblem } from "../../house/kit-validation.ts";
import { allowed, mindTool, present } from "../../house/kit.ts";
import { houseStep } from "../../house/members.ts";
import { effectRefusalTexts, toolTexts } from "../../texts/tools.texts.ts";
import type { Execution } from "../execute.ts";
import { deviceOwnerProblem } from "../identities/device-actions.ts";
import { isMindCardAction } from "../minds/mind-settings-actions.ts";
import { isPersonalTool } from "../personal/personal.ts";
import { ruleEffectProblem } from "../rules/rule-effects.ts";
import type { ActContext, ActResult, Program, Tool } from "../tool-contract.ts";
import { assistantEffect } from "./assistant-effects.ts";
/** A reserved identifier, never a flag supplied by a program, identifies a core piece. */
const corePiece = (id: string | undefined): boolean => id === "identities";
export const coreSelf = (tool: string | undefined, by: string, target: string): boolean =>
  corePiece(tool) && !isMindActor(by) && target === `identities/${by}`;
function invalidKit<X extends Program>(ports: Execution<X>, event: HouseEmission<"kit-set">) {
  if ("version" in event.data) {
    const { holder, kit } = event.data;
    const house = ports.state().house;
    if (holder === house.admin || holder.startsWith("assistant:")) return effectRefusalTexts.adminKit;
    if (!present(ports.registry, house, holder)) return effectRefusalTexts.absentHolder;
    const own = mindTool(holder);
    if (own && kit.selections.some(selection => selection.program !== own)) return effectRefusalTexts.unassignedTool;
    const previous = new Set(storedHolderKit(house, holder).selections.map(selectionPath));
    return selectionProblem(
      selectionKit(kit.selections.filter(selection => !previous.has(selectionPath(selection)))),
      ports.registry,
    );
  }
  const { holder, tool, acts } = event.data;
  const house = ports.state().house;
  const declared = ports.registry.find(each => each.id === tool);
  if (holder.startsWith("assistant:")) return effectRefusalTexts.adminKit;
  const own = mindTool(holder);
  if (!present(ports.registry, house, holder)) return effectRefusalTexts.absentHolder;
  if (!declared || (own === undefined ? !allowed(house, holder, tool) : own !== tool))
    return effectRefusalTexts.unassignedTool;
  if (holder === house.admin || corePiece(tool)) return effectRefusalTexts.adminKit;
  if (acts !== null && new Set(acts).size !== acts.length) return effectRefusalTexts.repeatedActs;
  if (acts !== null && acts.some(name => !Object.hasOwn(declared.acts, name))) return effectRefusalTexts.unknownAct;
  return undefined;
}
function coreAuthority<X extends Program>(
  ports: Execution<X>,
  house: Parameters<typeof houseStep>[0],
  each: HouseEmission,
  context: ActContext<X>,
  tool: Tool<X> | undefined,
): string | undefined {
  if (each.kind === "device-registered" || each.kind === "device-accepted" || each.kind === "device-retired")
    return deviceEffect(ports, house, each, context);
  const self =
    coreSelf(tool?.id, context.by, context.target) &&
    (each.kind === "scene" || (each.kind === "named" && each.data.identity === context.by));
  let delegated = false;
  try {
    const option = ports.state().acts.get(context.id ?? "")?.data.option;
    delegated = assistantEffect(house, each, context, option, ports.registry);
  } catch (error) {
    if (error instanceof MindContractError) return error.message;
    throw error;
  }
  if (
    (each.kind.startsWith("mind-") && each.kind !== "mind-card-assigned") ||
    each.kind.startsWith("device-") ||
    each.kind.startsWith("journey-") ||
    each.kind.startsWith("model-call-")
  )
    return effectRefusalTexts.houseFact;
  if (context.by !== house.admin && !self && !delegated) return effectRefusalTexts.adminRequired;
  return undefined;
}
export function effectRefusal<X extends Program>(
  ports: Execution<X>,
  result: ActResult<X>,
  context: ActContext<X>,
  tool: Tool<X> | undefined,
  source: "house" | "tool" | "own",
): string | undefined {
  let house = ports.state().house;
  for (const each of result.effects ?? []) {
    const refuse = (why: string) => toolTexts.effectRefused(each.kind, why);
    if (each.by !== context.by) return refuse(effectRefusalTexts.otherAuthor);
    // Custody commands are opaque, lease-bound requests, not journal facts supplied by the program.
    if (ports.credentialEffects?.recognizes(each)) continue;
    if (each.layer === "program" && layerOf(each.kind) === "program") {
      if (!tool?.facts?.includes(each.kind)) return refuse(effectRefusalTexts.otherTool);
      continue;
    }
    if (each.layer !== "house") return refuse(effectRefusalTexts.houseFact);
    if (each.kind === "tool-entry" && each.data.author !== context.by) return refuse(effectRefusalTexts.otherAuthor);
    if (each.kind === "mind-card-assigned" || each.kind.startsWith("rule-")) {
      const why = specialEffect(ports, house, each, context, tool);
      if (why) return refuse(why);
      house = houseStep(house, { ...each, id: "validation", seq: 0, at: context.at });
      continue;
    }
    if (tool && isPersonalTool(tool)) {
      if (!["scene", "preferred", "attended", "unattended"].includes(each.kind) || context.target !== "personal")
        return refuse(effectRefusalTexts.houseFact);
    } else if (source !== "house") {
      if (source === "own" || !corePiece(tool?.id) || !house.identities) return refuse(effectRefusalTexts.houseFact);
      const why = coreAuthority(ports, house, each, context, tool);
      if (why) return refuse(why);
    }
    if (each.kind === "kit-set") {
      const why = invalidKit({ ...ports, state: () => ({ ...ports.state(), house }) }, each);
      if (why) return refuse(why);
    }
    house = houseStep(house, { ...each, id: "validation", seq: 0, at: context.at });
  }
  return undefined;
}

function deviceEffect<X extends Program>(
  ports: Execution<X>,
  house: Parameters<typeof houseStep>[0],
  each: HouseEmission<"device-registered" | "device-accepted" | "device-retired">,
  context: ActContext<X>,
) {
  const expected = {
    "device-registered": "register-device",
    "device-accepted": "accept-device",
    "device-retired": "retire-device",
  };
  if (ports.state().acts.get(context.id ?? "")?.data.option !== expected[each.kind])
    return effectRefusalTexts.houseFact;
  const owner = each.kind === "device-registered" ? each.by : house.devices.devices.get(each.data.device)?.owner;
  if (context.target !== `identities/${owner ?? ""}`) return effectRefusalTexts.houseFact;
  return deviceOwnerProblem(
    { ...ports.state(), house, by: context.by },
    context.target,
    each.kind === "device-registered",
  );
}
function specialEffect<X extends Program>(
  ports: Execution<X>,
  house: Parameters<typeof houseStep>[0],
  each: HouseEmission,
  context: ActContext<X>,
  tool: Tool<X> | undefined,
) {
  if (each.kind !== "mind-card-assigned") return ruleEffectProblem(ports, house, each, context, tool);
  const action = tool?.acts["assign-mind-card"];
  return !action || !isMindCardAction(action)
    ? effectRefusalTexts.houseFact
    : coreAuthority(ports, house, each, context, tool);
}
