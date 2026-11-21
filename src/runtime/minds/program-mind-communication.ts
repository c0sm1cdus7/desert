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
import type { Language } from "../../fields/languages.ts";
import { withCuts } from "./journey-cut-scene.ts";
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
/** The scene a consciousness writes keeps its cut journeys first, as its copied scene does. */
export function applyProgramCommunication<X extends Program>(
  house: MindRuntimeHouse<X>,
  proposal: ProposedAct,
  scope: MindScope,
  language: Language,
) {
  const { input } = proposal;
  if (scope.kind !== "consciousness" || proposal.act !== "scene" || !Value.Check(scene, input)) return undefined;
  const state = house.execution.state().house;
  if (Object.keys(input.to ?? {}).some(to => !state.grants.has(to))) return undefined;
  const general = withCuts(state, scope.actor, language, input.general);
  return house.execution.bus.emit(effect("scene", { ...input, general }, scope.actor));
}
