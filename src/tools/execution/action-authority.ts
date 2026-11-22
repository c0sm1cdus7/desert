// Resolve action authority against the current identity, attendance, kit and journey.
import { isMindActor } from "../../fields/mind-actor.ts";
import { isAttended, targetTool } from "../../house/attendance.ts";
import type { HouseEvent } from "../../house/facts.ts";
import { ids } from "../../house/ids.ts";
import { allowedAct, present } from "../../house/kit.ts";
import { identityView } from "../../house/members.ts";
import { journeyAllows } from "../../house/minds/journey-state.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import type { Execution } from "../execution-contract.ts";
import { programOffered } from "../program-run.ts";
import type { Program, Tool, ToolAct } from "../tool-contract.ts";
import { destinationProblem, executionReach } from "./device-execution.ts";
type Origin = HouseEvent<"act">;
export type Resolving<X extends Program> = Pick<Execution<X>, "state" | "own" | "registry">;
/** The act an identity's act resolves to: one the house offers it directly first, then the target's tool act. */
export const resolve = <X extends Program>(ports: Resolving<X>, by: string, target: string, option: string) => {
  const state = identityView(ports.state(), by);
  const offered = ports
    .own(state)
    .find(
      act =>
        act.object === target &&
        act.option === option &&
        (!isMindActor(by) || (target === ids.self && option === "scene")),
    );
  const tool = targetTool(ports.registry, state, target);
  return { state, offered, tool, act: offered ?? tool?.acts[option] };
};
/** An act that says where it stands is done there: on its tool itself, or on one of its tool's things. */
const elsewhere = <X extends Program>(act: ToolAct<X>, tool: Tool<X>, target: string): boolean =>
  act.on !== undefined && (act.on === "tool") !== (target === tool.id);
/** Why the house refuses an act, or its tool declines it now (`offered`): the house's cause comes first. */
export function refusal<X extends Program>(ports: Execution<X>, origin: Origin, found: ReturnType<typeof resolve<X>>) {
  return authority(ports, origin, found) ?? declined(ports, origin, found);
}
/** Why the tool itself declines an act now, before it runs: its own cause, not the house's. */
export function declined<X extends Program>(ports: Execution<X>, origin: Origin, found: ReturnType<typeof resolve<X>>) {
  return found.act ? programOffered(found.act, found.state, origin.data.object, ports.now()) : undefined;
}
/** Why the house refuses an act, whatever its tool says of it now. */
export function authority<X extends Program>(
  ports: Execution<X>,
  origin: Origin,
  found: ReturnType<typeof resolve<X>>,
) {
  const { by, process } = origin;
  const { state, offered, tool, act } = found;
  const target = origin.data.object;
  if (!present(ports.registry, state.house, by) || (process && !ports.process(process, by)))
    return toolTexts.unassigned;
  if (!act) return toolTexts.unknown;
  const destination = destinationProblem(act.execution, origin.data.destination);
  if (destination) return destination;
  if (origin.data.reaction && executionReach(act) !== "house") return toolTexts.invalid;
  if (!offered && (!tool || !allowedAct(state.house, by, tool.id, origin.data.option, ports.registry)))
    return toolTexts.kitRefusal(tool?.id ?? "");
  if (!offered && tool && elsewhere(act, tool, target)) return toolTexts.unknown;
  if (
    process &&
    state.house.journeys.has(process) &&
    (!tool ||
      !journeyAllows(
        state.house.journeys,
        process,
        by,
        tool.id,
        origin.data.option,
        state.house.kitLayout,
        state.house.kitMigration,
      ))
  )
    return toolTexts.outsideKit;
  const unseen = !offered && !ports.contractual && !isMindActor(by) && !isAttended(state, tool?.id ?? "", target);
  if (unseen) return toolTexts.unattended;
  return undefined;
}
