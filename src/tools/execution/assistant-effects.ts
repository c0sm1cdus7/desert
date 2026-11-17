// Restringe los hechos administrativos del asistente a su acto concreto y a su titular o administrador.
import { isMindActor, parseMindActor } from "../../fields/mind-actor.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import { houseStep, type House } from "../../house/members.ts";
import type { HouseEmission } from "../../house/facts.ts";
import type { ActContext, Program, ToolRegistry } from "../tool-contract.ts";
export function assistantEffect<X extends Program>(
  house: House,
  event: HouseEmission,
  context: ActContext<X>,
  option: string | undefined,
  registry: ToolRegistry<X>,
): boolean {
  if (event.kind === "mind-card-assigned") return cardEffect(house, event, context, option, registry);
  if (
    event.kind !== "assistant-enabled" &&
    event.kind !== "assistant-disabled" &&
    event.kind !== "assistant-kit-set" &&
    event.kind !== "assistant-adopted"
  )
    return false;
  const options = {
    "assistant-enabled": ["enable-assistant", "adopt-assistant"],
    "assistant-disabled": ["disable-assistant"],
    "assistant-kit-set": ["delegate-assistant", "adopt-assistant"],
    "assistant-adopted": ["adopt-assistant"],
  };
  requireMind(option !== undefined && options[event.kind].includes(option), "assistant.act");
  requireMind(!isMindActor(context.by) && context.target === `identities/${event.data.owner}`, "assistant.target");
  if (event.kind === "assistant-kit-set") {
    requireMind(context.by === event.data.owner, "assistant.owner");
    requireMind(
      event.data.kit.every(({ tool, acts }) => {
        const declared = registry.find(each => each.id === tool);
        return declared && acts.every(act => Object.hasOwn(declared.acts, act));
      }),
      "assistant.kit",
    );
  }
  houseStep(house, { ...event, id: "validation", seq: 0, at: context.at });
  return event.kind === "assistant-kit-set";
}

function cardEffect<X extends Program>(
  house: House,
  event: HouseEmission<"mind-card-assigned">,
  context: ActContext<X>,
  option: string | undefined,
  registry: ToolRegistry<X>,
): boolean {
  const actor = parseMindActor(event.data.mind);
  requireMind(option === "assign-mind-card" && context.by === house.admin && actor, "card.admin");
  const target = actor.kind === "assistant" ? `identities/${actor.owner}` : actor.tool;
  requireMind(context.target === target, "card.target");
  requireMind(actor.kind !== "tool" || registry.some(tool => tool.id === actor.tool), "card.tool");
  return true;
}
