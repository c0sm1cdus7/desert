// Offers native messages in every mind scope and preserves their causal request chain.
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { communicationInputs } from "../../tools/minds/communication-inputs.ts";
const { scene, message } = communicationInputs;
import { effect } from "../../house/facts.ts";
import { mindText } from "../../house/minds/journey-facts.ts";
import { object } from "../../fields/visible-text.ts";
import type { MindDefinition, MindScope } from "../../tools/minds/mind-contract.ts";
import type { MindMenu, ProposedAct } from "../../tools/minds/mind-answer.ts";
import type { Program, State } from "../../tools/tool-contract.ts";
import type { MindRuntimeHouse, MindRuntimeOptions } from "./mind-runtime-options.ts";
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
  options: MindRuntimeOptions,
  state: State<X>,
): MindMenu {
  const recipients = [...state.house.grants.keys(), ...options.definitions.map(item => item.actor)].filter(
    actor => actor !== scope.actor,
  );
  const requests = state.house.minds.messages.filter(
    event => event.data.to === scope.actor && event.by !== scope.actor,
  );
  return definition.communication.flatMap(item => {
    if (item.tool !== "mind" || (item.act !== "scene" && item.act !== "message")) return [];
    if (item.act === "scene" && scope.kind !== "consciousness") return [];
    if (item.act === "message" && !recipients.length) return [];
    return [
      {
        tool: "mind",
        act: item.act,
        target: scope.actor,
        scope: scope.kind === "consciousness" ? ("communication" as const) : ("control" as const),
        input:
          item.act === "scene"
            ? sceneInput(state)
            : object({
                to: Type.Union(recipients.map(to => Type.Literal(to))),
                text: mindText,
                ...(requests.length
                  ? { replyTo: Type.Optional(Type.Union(requests.map(event => Type.Literal(event.id)))) }
                  : {}),
              }),
      },
    ];
  });
}
export function applyProgramCommunication<X extends Program>(
  house: MindRuntimeHouse<X>,
  proposal: ProposedAct,
  turn: string,
  scope: MindScope,
  cause: readonly string[],
) {
  const { input } = proposal;
  if (scope.kind === "consciousness" && proposal.act === "scene" && Value.Check(scene, input)) {
    if (Object.keys(input.to ?? {}).some(to => !house.execution.state().house.grants.has(to))) return undefined;
    return house.execution.bus.emit(effect("scene", input, scope.actor));
  }
  if (proposal.act === "message" && Value.Check(message, input)) {
    const { replyTo, ...content } = input;
    const request = replyTo
      ? house.execution.state().house.minds.messages.find(event => event.id === replyTo)
      : undefined;
    if (replyTo && (!request || request.by !== input.to || request.data.to !== scope.actor)) return undefined;
    return house.execution.bus.emit(
      effect("mind-message", { turn, ...content }, scope.actor, request ? [request.id] : cause, scope.process),
    );
  }
  return undefined;
}
