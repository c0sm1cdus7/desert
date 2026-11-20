// Revisa una salida de mente y vuelve al control común con permisos y reglas actuales tras la espera.
import type { Execution, Decision } from "../execute.ts";
import type { Program } from "../tool-contract.ts";
import type { Act } from "../../house/own-acts.ts";
import type { HouseEvent } from "../../house/facts.ts";
import { parseMindActor } from "../../fields/mind-actor.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { rejected } from "./perform-act.ts";
type Origin = HouseEvent<"act">;
export async function reviewWorld<X extends Program>(
  ports: Execution<X>,
  value: Act,
  origin: Origin,
  signal: AbortSignal | undefined,
  resume: () => Decision<X> | Promise<Decision<X>>,
  reason: "world" | "rule" = "world",
): Promise<Decision<X>> {
  const scope = ports.mindScope ?? processScope(ports, origin);
  if (!scope || !ports.review) return rejected(toolTexts.unassigned);
  const request = {
    id: origin.id,
    reason,
    scope,
    through: ports.state().through,
    acts: [
      {
        act: value.act,
        target: origin.data.object,
        input: value.input,
        ...(value.destination ? { destination: value.destination } : {}),
      },
    ],
  };
  const result = await ports.review.review(request);
  if (result.outcome !== "passed" || result.proposal !== origin.id || result.through !== request.through)
    return rejected(result.text || toolTexts.invalid);
  if (!ports.live() || signal?.aborted) return rejected(toolTexts.withdrawn);
  return resume();
}
function processScope<X extends Program>(ports: Execution<X>, origin: Origin) {
  if (!parseMindActor(origin.by)) return undefined;
  const actor = origin.by;
  if (!actor.startsWith("mind:") && !actor.startsWith("assistant:")) return undefined;
  const journey = origin.process ? ports.state().house.journeys.get(origin.process) : undefined;
  // The actor schema is checked again by the review port; no identity is promoted to a mind.
  if (actor.startsWith("mind:")) {
    const mind = `mind:${actor.slice(5)}` as const;
    return journey
      ? { kind: "journey" as const, actor: mind, process: journey.id, kit: journey.kit }
      : { kind: "consciousness" as const, actor: mind };
  }
  const mind = `assistant:${actor.slice(10)}` as const;
  return journey
    ? { kind: "journey" as const, actor: mind, process: journey.id, kit: journey.kit }
    : { kind: "consciousness" as const, actor: mind };
}
