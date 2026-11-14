// Writing a result and its diagnostic cannot turn a storage failure into a program defect or silence it.
import { OutsideDefect } from "../outside.ts";
import { effect, type HouseEvent } from "../../journal/events.ts";
import type { Decision, Execution } from "../execute.ts";
import type { Program } from "../tool-contract.ts";
import { executionFailure } from "../execution/execution-failure.ts";
import { writtenEffects } from "../execution/written-effects.ts";
import { BaseFailure, baseEntry, lostDiagnostic } from "./base-failure.ts";
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

export function finish<X extends Program>(ports: Execution<X>, act: HouseEvent<"act">, decision: Decision<X>) {
  decision = cutDecision(ports, decision);
  const safe = ports.secrets.scrub(decision);
  if (!ports.live()) return safe;
  if (ports.active) ports.active.writing = true;
  const failure = writtenEffects(ports, act, decision.effects, decision.status === "accepted");
  let done: Decision<X> = safe;
  if (failure !== undefined) {
    done = failedDecision(
      ports,
      act,
      !safe.defect && failure.error instanceof OutsideDefect
        ? failure.error
        : new BaseFailure({ failure, original: safe }),
    );
    if (safe.defect) lostDiagnostic(safe, done);
    const lost = writtenEffects(ports, act, done.effects);
    if (lost !== undefined) {
      done = failedDecision(ports, act, new BaseFailure({ lost, original: done }));
      reportLost(ports, act, done, lost);
    }
  }
  done = cutDecision(ports, done);
  const output = done.status === "accepted" && done.output ? { output: true } : {};
  const defect = done.defect ? { defect: true as const } : {};
  const data = { ...defect, act: act.id, status: done.status, reason: done.reason ?? "", ...output };
  const result = writtenEffects(ports, act, [effect("act-result", data, act.by, [act.id], act.process)]);
  if (result !== undefined) {
    const failed = failedDecision(ports, act, result.error);
    const lost = writtenEffects(ports, act, failed.effects);
    if (lost !== undefined) reportLost(ports, act, failed, lost);
    return failed;
  }
  return done;
}
