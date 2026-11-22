// Confirms each reaction together with its result and keeps the diagnostics of write failures.
import { toolTexts } from "../../texts/tools.texts.ts";
import { OutsideDefect, BaseFailure } from "../../fields/program-call.ts";
import { effect, type HouseEvent } from "../../house/facts.ts";
import type { Decision, Execution } from "../execute.ts";
import type { Program } from "../tool-contract.ts";
import { executionFailure } from "../execution/execution-failure.ts";
import { writtenEffects } from "../execution/written-effects.ts";

import { baseEntry, lostDiagnostic } from "./base-failure.ts";
import { cutDecision } from "../execution/running-acts.ts";
const reportLost = <X extends Program>(ports: Execution<X>, act: HouseEvent<"act">, entry: unknown, error: unknown) =>
  lostDiagnostic(
    entry,
    ports.secrets.scrub(
      baseEntry(ports.secrets.scrub(error), act.by, act.data.object, act.data.object, act.data.option),
    ),
  );

const failedDecision = <X extends Program>(ports: Execution<X>, act: HouseEvent<"act">, error: unknown) =>
  ports.secrets.scrub(executionFailure(ports.registry, ports.state(), act, ports.secrets.scrub(error)));

function reactionDecision<X extends Program>(act: HouseEvent<"act">, decision: Decision<X>): Decision<X> {
  if (act.data.reaction && decision.status !== "accepted") {
    const data = {
      tool: act.data.object,
      target: act.data.object,
      author: act.by,
      attention: true,
      text: toolTexts.reactionPending(act.data.reaction.id, decision.reason ?? toolTexts.interrupted),
    };
    decision = {
      ...decision,
      effects: [...decision.effects.filter(each => each.layer === "house"), effect("tool-entry", data, act.by)],
    };
  }
  return decision;
}
const receipt = <X extends Program>(act: HouseEvent<"act">, done: Decision<X>) =>
  effect(
    "act-result",
    {
      act: act.id,
      status: done.status,
      reason: done.reason ?? "",
      ...(done.defect ? { defect: true as const } : {}),
      ...(done.status === "accepted" && done.output ? { output: true } : {}),
    },
    act.by,
    [act.id],
    act.process,
  );
export function finish<X extends Program>(ports: Execution<X>, act: HouseEvent<"act">, decision: Decision<X>) {
  decision = cutDecision(ports, decision);
  decision = reactionDecision(act, decision);
  const safe = ports.secrets.scrub(decision);
  if (!ports.live()) return safe;
  if (ports.active) ports.active.writing = true;
  // A reaction's receipt is inseparable from its effects, including a failure after the last effect.
  const atomic = act.data.reaction !== undefined;
  const failure = writtenEffects(
    ports,
    act,
    atomic ? [...decision.effects, receipt(act, safe)] : decision.effects,
    decision.status === "accepted",
  );
  if (atomic && failure === undefined) return safe;
  let done: Decision<X> = safe;
  if (failure !== undefined) {
    done = failedDecision(
      ports,
      act,
      !safe.defect && failure.error instanceof OutsideDefect
        ? failure.error
        : new BaseFailure({ failure, original: publicDecision(safe) }),
    );
    if (safe.defect) lostDiagnostic(publicDecision(safe), done);
    const lost = writtenEffects(ports, act, done.effects);
    if (lost !== undefined) {
      done = failedDecision(ports, act, new BaseFailure({ lost, original: done }));
      reportLost(ports, act, done, lost);
    }
  }
  done = cutDecision(ports, done);
  const result = writtenEffects(ports, act, [receipt(act, done)]);
  if (result !== undefined) {
    const failed = failedDecision(ports, act, result.error);
    const lost = writtenEffects(ports, act, failed.effects);
    if (lost !== undefined) reportLost(ports, act, failed, lost);
    return failed;
  }
  return done;
}

function publicDecision<X extends Program>(decision: Decision<X>): Decision<X> {
  const { private: _private, ...publicPart } = decision;
  return publicPart;
}
