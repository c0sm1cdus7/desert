// Previous refusals are declared too: a stray cause is a programmer defect through every door.
import { meant, same, type Text } from "../../fields/phrases.ts";
import type { ProgramAct } from "../promises-contract.ts";
import type { Program, ToolAct } from "../tool-contract.ts";
import { answerChange } from "../inputs/answer-change.ts";
import { identityNameTexts, toolTexts } from "../../texts/tools.texts.ts";
import { OutsideDefect } from "../../fields/program-call.ts";
export const ofTheBase = (cause: Text): boolean =>
  answerChange(cause).unchanged || same(cause, toolTexts.noSuchDay) || same(cause, identityNameTexts.rule);
/** A refusal is one of the causes its act declares, alone or followed by more: told apart by its English. */
export function declaredCause(causes: readonly Text[], reason: Text | undefined): Text | undefined {
  if (reason === undefined || ofTheBase(reason)) return reason;
  if (!causes.some(cause => same(reason, cause) || meant(reason).startsWith(`${meant(cause)} · `)))
    throw new OutsideDefect(`An act refused with a cause it does not declare: ${meant(reason)}`);
  return reason;
}

export const isProgram = <X extends Program>(act: ToolAct<X>): act is ProgramAct<X> =>
  "outside" in act && "refuses" in act && "cases" in act;
