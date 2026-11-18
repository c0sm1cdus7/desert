// Ofrece a la consciencia escena por identidad y mensajes explícitos sin conceder acciones de trabajo.
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { scene } from "../../house/own-acts.ts";
import { effect } from "../../house/facts.ts";
import { mindText } from "../../house/minds/journey-facts.ts";
import { object } from "../../fields/visible-text.ts";
import type { MindDefinition, MindScope } from "../../tools/minds/mind-contract.ts";
import type { MindMenu, ProposedAct } from "../../tools/minds/mind-answer.ts";
import type { Program, State } from "../../tools/tool-contract.ts";
import type { MindRuntimeHouse, MindRuntimeOptions } from "./mind-runtime-options.ts";
const message = object({ to: Type.String(), text: mindText });
export function programCommunication<X extends Program>(
  scope: MindScope,
  definition: MindDefinition,
  options: MindRuntimeOptions,
  state: State<X>,
): MindMenu {
  if (scope.kind !== "consciousness") return [];
  const recipients = [...state.house.grants.keys(), ...options.definitions.map(item => item.actor)].filter(
    actor => actor !== scope.actor,
  );
  return definition.communication.flatMap(item => {
    if (item.tool !== "mind" || (item.act !== "scene" && item.act !== "message")) return [];
    if (item.act === "message" && !recipients.length) return [];
    return [
      {
        tool: "mind",
        act: item.act,
        target: scope.actor,
        scope: "communication" as const,
        input:
          item.act === "scene"
            ? object({
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
              })
            : object({ to: Type.Union(recipients.map(to => Type.Literal(to))), text: mindText }),
      },
    ];
  });
}
export function applyProgramCommunication<X extends Program>(
  house: MindRuntimeHouse<X>,
  proposal: ProposedAct,
  turn: string,
  scope: MindScope,
) {
  if (scope.kind !== "consciousness") return undefined;
  const { input } = proposal;
  if (proposal.act === "scene" && Value.Check(scene, input)) {
    if (Object.keys(input.to ?? {}).some(to => !house.execution.state().house.grants.has(to))) return undefined;
    return house.execution.bus.emit(effect("scene", input, scope.actor));
  }
  if (proposal.act === "message" && Value.Check(message, input))
    return house.execution.bus.emit(effect("mind-message", { turn, ...input }, scope.actor));
  return undefined;
}
