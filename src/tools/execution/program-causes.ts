// Previous refusals are declared too: a stray cause is a programmer defect through every door.
import { BaseFailure } from "../failures/base-failure.ts";
import type { ProgramAct } from "../promises-contract.ts";
import type { Program, ToolAct } from "../tool-contract.ts";
import { answerChange } from "../answers/answer-change.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { OutsideDefect } from "../outside.ts";

export const ofTheBase = (cause: string): boolean => answerChange(cause).unchanged || cause === toolTexts.noSuchDay;
export function declaredCause(causes: readonly string[], reason: string | undefined): string | undefined {
  if (reason === undefined || ofTheBase(reason)) return reason;
  if (!causes.some(cause => reason === cause || reason.startsWith(`${cause} · `)))
    throw new OutsideDefect(`An act refused with a cause it does not declare: ${reason}`);
  return reason;
}
export function programRule<T>(read: () => T): T {
  try {
    return read();
  } catch (error) {
    throw error instanceof OutsideDefect || error instanceof BaseFailure ? error : new OutsideDefect(error);
  }
}

export const isProgram = <X extends Program>(act: ToolAct<X>): act is ProgramAct<X> =>
  "outside" in act && "refuses" in act && "cases" in act;
