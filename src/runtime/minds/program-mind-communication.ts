// Offers the consciousness its scene; minds say everything else through the programs in their kit.
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { communicationInputs } from "../../tools/minds/communication-inputs.ts";
const { scene } = communicationInputs;
import { effect } from "../../house/facts.ts";
import { object } from "../../fields/visible-text.ts";
import type { MindDefinition, MindScope } from "../../tools/minds/mind-contract.ts";
import type { MindMenu, ProposedAct } from "../../tools/minds/mind-answer.ts";
import type { Program, State } from "../../tools/tool-contract.ts";
import type { MindRuntimeHouse } from "./mind-runtime-options.ts";
function sceneInput<X extends Program>(state: State<X>) {
  return object({
    general: scene.properties.general,
    to: Type.Optional(
      object(
        Object.fromEntries(
          [...state.house.grants.keys()].map(identity => [
            identity,
            Type.Optional(Type.String({ minLength: 1, maxLength: 1000 })),
          ]),
        ),
      ),
    ),
  });
}
export function programCommunication<X extends Program>(
  scope: MindScope,
  definition: MindDefinition,
  state: State<X>,
): MindMenu {
  if (scope.kind !== "consciousness") return [];
  return definition.communication.flatMap(item =>
    item.tool === "mind" && item.act === "scene"
      ? [{ tool: "mind", act: "scene", target: scope.actor, scope: "communication" as const, input: sceneInput(state) }]
      : [],
  );
}
export function applyProgramCommunication<X extends Program>(
  house: MindRuntimeHouse<X>,
  proposal: ProposedAct,
  scope: MindScope,
) {
  const { input } = proposal;
  if (scope.kind !== "consciousness" || proposal.act !== "scene" || !Value.Check(scene, input)) return undefined;
  if (Object.keys(input.to ?? {}).some(to => !house.execution.state().house.grants.has(to))) return undefined;
  return house.execution.bus.emit(effect("scene", input, scope.actor));
}
