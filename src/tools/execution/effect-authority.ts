// Validate the complete returned batch before the engine adds its own execution facts.
import { allowed, mindTool, present } from "../../house/kit.ts";
import { houseStep } from "../../house/members.ts";
import { layerOf, type HouseEmission } from "../../house/facts.ts";
import { effectRefusalTexts, toolTexts } from "../../texts/tools.texts.ts";
import type { Execution } from "../execute.ts";
import type { ActContext, ActResult, Program, Tool } from "../tool-contract.ts";
/** A reserved identifier, never a flag supplied by a program, identifies a core piece. */
export const corePiece = (id: string | undefined): boolean => id === "identities";
export const coreSelf = (tool: string | undefined, by: string, target: string): boolean =>
  corePiece(tool) && mindTool(by) === undefined && target === `identities/${by}`;
function invalidKit<X extends Program>(ports: Execution<X>, event: HouseEmission<"kit-set">) {
  const { holder, tool, acts } = event.data;
  const house = ports.state().house;
  const declared = ports.registry.find(each => each.id === tool);
  const own = mindTool(holder);
  if (!present(ports.registry, house, holder)) return effectRefusalTexts.absentHolder;
  if (!declared || (own === undefined ? !allowed(house, holder, tool) : own !== tool))
    return effectRefusalTexts.unassignedTool;
  if (holder === house.admin || corePiece(tool)) return effectRefusalTexts.adminKit;
  if (acts !== null && new Set(acts).size !== acts.length) return effectRefusalTexts.repeatedActs;
  if (acts !== null && acts.some(name => !Object.hasOwn(declared.acts, name))) return effectRefusalTexts.unknownAct;
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
    if (source !== "house") {
      if (source === "own" || !corePiece(tool?.id) || !house.identities) return refuse(effectRefusalTexts.houseFact);
      const self =
        coreSelf(tool?.id, context.by, context.target) &&
        (each.kind === "scene" || (each.kind === "named" && each.data.identity === context.by));
      if (context.by !== house.admin && !self) return refuse(effectRefusalTexts.adminRequired);
    }
    if (each.kind === "kit-set") {
      const why = invalidKit({ ...ports, state: () => ({ ...ports.state(), house }) }, each);
      if (why) return refuse(why);
    }
    house = houseStep(house, { ...each, id: "validation", seq: 0, at: context.at });
  }
  return undefined;
}
