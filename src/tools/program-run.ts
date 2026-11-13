// Every execution of a program act checks its current declaration before entering its body.
import { Value } from "@sinclair/typebox/value";
import { fine, wrongIn } from "../catalogs/fields.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { outsideRun } from "./outside.ts";
import { declaredCause, isProgram, programRule } from "./execution/program-causes.ts";
import type { ProgramAct } from "./promises-contract.ts";
import { refusedWhole } from "./so-far.ts";
import type { ActContext, ActResult, Program, State, ToolAct } from "./tool-contract.ts";

export function programOffered<X extends Program>(act: ToolAct<X>, state: State<X>, target: string, at: number) {
  return isProgram(act)
    ? programRule(() => declaredCause(act.refuses, act.offered?.(state, target, at)))
    : act.offered?.(state, target, at);
}
function before<X extends Program>(act: ProgramAct<X>, value: unknown, context: ActContext<X>) {
  if (!Value.Check(act.input, value) || !fine(act.input, value)) return toolTexts.invalid;
  const whole = refusedWhole(act.input, act, value);
  const wrong = wrongIn(act.input, value, context.at) ?? whole(context.state, context.target, act.refuses, context.at);
  declaredCause(act.refuses, wrong);
  if (wrong !== undefined) return wrong;
  return act.today && Value.Equal(act.today(context.state, context.target, context.at), value)
    ? toolTexts.unchanged
    : undefined;
}
export function runProgram<X extends Program>(
  act: ToolAct<X>,
  value: unknown,
  context: ActContext<X>,
): ActResult<X> | Promise<ActResult<X>> {
  if (!isProgram(act)) return act.run(value, context);
  const reason = programRule(() => before(act, value, context));
  if (reason !== undefined) return { status: "rejected", reason };
  return outsideRun(act.outside, () => act.run(value, context));
}
