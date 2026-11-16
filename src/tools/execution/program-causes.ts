// Previous refusals are declared too: a stray cause is a programmer defect through every door.
import type { ProgramAct } from "../promises-contract.ts";
import type { Program, ToolAct } from "../tool-contract.ts";
import { answerChange } from "../inputs/answer-change.ts";
import { identityNameTexts, toolTexts } from "../../texts/tools.texts.ts";
import { OutsideDefect } from "../../fields/program-call.ts";
export const ofTheBase = (cause: string): boolean =>
  answerChange(cause).unchanged || cause === toolTexts.noSuchDay || cause === identityNameTexts.rule;
export function declaredCause(causes: readonly string[], reason: string | undefined): string | undefined {
  if (reason === undefined || ofTheBase(reason)) return reason;
  if (!causes.some(cause => reason === cause || reason.startsWith(`${cause} · `)))
    throw new OutsideDefect(`An act refused with a cause it does not declare: ${reason}`);
  return reason;
}

export const isProgram = <X extends Program>(act: ToolAct<X>): act is ProgramAct<X> =>
  "outside" in act && "refuses" in act && "cases" in act;
