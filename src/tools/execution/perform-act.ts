// Runs the announced body, classifies failures and closes sync or pending results with their notices.
import { MechanicalRuleFailure } from "../rules/rule-failure.ts";
import { effect, type HouseEvent } from "../../house/facts.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { identityView } from "../../house/members.ts";
import { targetTool } from "../../house/attendance.ts";
import { finish } from "../failures/finish.ts";
import { actNews, type Program } from "../tool-contract.ts";
import type { Decision, Execution, ExecutionResult } from "../execute.ts";
import { actionFailure } from "./action-failure.ts";
/** A rejected decision that carries its reason and no effects. */
export const rejected = (reason: string) => ({ status: "rejected" as const, reason, effects: [] });
export const performAct = <X extends Program>(
  ports: Execution<X>,
  act: HouseEvent<"act">,
  perform: () => Decision<X> | Promise<Decision<X>>,
): ExecutionResult<X> => {
  const { object, option } = act.data;
  const tool = targetTool(ports.registry, identityView(ports.state(), act.by), object)?.id ?? object;
  try {
    ports.bus.emit(effect("act-started", { act: act.id, object, option }, act.by, [act.id], act.process));
  } catch (error) {
    return finish(ports, act, actionFailure(ports, act, error));
  }
  /** Program failures have one public message and a separate support record. */
  const failed = (error: unknown): Decision<X> =>
    error instanceof MechanicalRuleFailure
      ? { status: "rejected", coreFailure: "forbidden", reason: error.reason, effects: error.effects }
      : actionFailure(ports, act, error);
  let result: Decision<X> | Promise<Decision<X>>;
  try {
    result = perform();
  } catch (error) {
    return finish(ports, act, failed(error));
  }
  if (!(result instanceof Promise)) return finish(ports, act, result);
  const completion = result.catch(failed).then((decision): Decision<X> => {
    if (!ports.live() && decision.status === "inconclusive") return decision;
    if (!ports.live()) return { status: "interrupted", reason: toolTexts.interrupted, effects: [] };
    const done = finish(ports, act, decision);
    if (actNews({ ...done, output: done.status === "accepted" && done.output }))
      ports.bus.emit(effect("stimulus", { tool }, act.by, [act.id], act.process));
    return done;
  });
  return { status: "processing", effects: [], completion };
};
