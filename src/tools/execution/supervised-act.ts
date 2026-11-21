// An act a rule marks waits for the supervisor's verdict, then goes back to the common checks with current rules.
import type { Execution, Decision } from "../execute.ts";
import type { Program } from "../tool-contract.ts";
import type { Act } from "../../house/own-acts.ts";
import type { HouseEvent } from "../../house/facts.ts";
import { parseMindActor } from "../../fields/mind-actor.ts";
import { rulesTexts } from "../../texts/rules.texts.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { rejected } from "./perform-act.ts";
import type { ProposedAct } from "../minds/mind-answer.ts";
type Origin = HouseEvent<"act">;
/** Passed, the act runs as if it had not waited; rejected or unjudged, it is a result with the words of why. */
export async function supervisedAct<X extends Program>(
  ports: Execution<X>,
  value: Act,
  origin: Origin,
  signal: AbortSignal | undefined,
  resume: () => Decision<X> | Promise<Decision<X>>,
): Promise<Decision<X>> {
  const through = ports.state().through;
  const act = {
    act: value.act,
    target: origin.data.object,
    input: value.input,
    ...(value.destination ? { destination: value.destination } : {}),
  };
  const result = await verdict(ports, origin, through, act);
  if (!result) return rejected(toolTexts.unassigned);
  if (result.proposal !== origin.id || result.through !== through) return rejected(toolTexts.invalid);
  if (result.outcome !== "passed") return rejected(rulesTexts.verdict(result.outcome, result.text));
  if (!ports.live() || signal?.aborted) return rejected(toolTexts.withdrawn);
  return resume();
}
/** A mind in its turn asks through its review port; anyone else, the supervisor in a turn of its own. */
function verdict<X extends Program>(ports: Execution<X>, origin: Origin, through: number, act: ProposedAct) {
  const scope = ports.mindScope ?? processScope(ports, origin);
  if (ports.review)
    return scope ? ports.review.review({ id: origin.id, reason: "rule", scope, through, acts: [act] }) : undefined;
  const supervisor = ports.supervisor?.();
  return typeof supervisor === "function" ? supervisor({ id: origin.id, by: origin.by, through, act }) : undefined;
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
