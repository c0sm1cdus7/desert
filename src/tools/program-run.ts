import { executionSchema } from "./inputs/secret-input.ts";
import { programCall } from "./boundaries/program-call.ts";
// Every execution of a program act checks its current declaration before entering its body.
import { answerChange } from "./answers/answer-change.ts";
import { Value } from "@sinclair/typebox/value";
import { fine, wrongIn } from "../catalogs/fields.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { outsideRun } from "./outside.ts";
import { declaredCause, isProgram } from "./execution/program-causes.ts";
import type { ProgramAct } from "./promises-contract.ts";
import { refusedWhole } from "./so-far.ts";
import type { ActContext, ActResult, Program, State, ToolAct } from "./tool-contract.ts";

export function programOffered<X extends Program>(act: ToolAct<X>, state: State<X>, target: string, at: number) {
  return isProgram(act)
    ? declaredCause(act.refuses, programCall(act.offered?.bind(act), state, target, at))
    : act.offered?.(state, target, at);
}
function before<X extends Program>(act: ProgramAct<X>, value: unknown, context: ActContext<X>) {
  if (!Value.Check(executionSchema(act.input), value) || !fine(executionSchema(act.input), value))
    return toolTexts.invalid;
  const whole = refusedWhole(executionSchema(act.input), act, value);
  const wrong =
    wrongIn(executionSchema(act.input), value, context.at) ??
    whole(context.state, context.target, act.refuses, context.at);
  declaredCause(act.refuses, wrong);
  const current = programCall(act.today?.bind(act), context.state, context.target, context.at);
  const same = current === undefined ? undefined : Value.Equal(current, value);
  return answerChange(wrong, same, same).refusal;
}
export function runProgram<X extends Program>(
  act: ToolAct<X>,
  value: unknown,
  context: ActContext<X>,
): ActResult<X> | Promise<ActResult<X>> {
  if (!isProgram(act)) return act.run(value, context);
  const reason = before(act, value, context);
  if (reason !== undefined) return { status: "rejected", reason };
  return outsideRun(act.outside, () => act.run(value, context));
}

/** An origin-specific disabled cause is declared just like a tool's own availability rule. */
export const programAlso = <X extends Program>(act: ProgramAct<X>, state: State<X>, from: string, at: number) =>
  declaredCause(act.refuses, programCall(act.also?.off?.bind(act.also), state, from, at));
