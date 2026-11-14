// A declared action as questions and confirmation, preserving the receiver of each program method.
import { currencyQuestions } from "../currency/currency-defect.ts";
import { programCall } from "../../../tools/boundaries/program-call.ts";
import { declaredCause } from "../../../tools/execution/program-causes.ts";
import { hides } from "../../../house/house.ts";
import { genericTexts as generic } from "../../../texts/generic-surface.texts.ts";
import type { ProgramAct } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { Field } from "../../contract.ts";
import type { Locale } from "../../masks.ts";
import { offeredOn } from "../picked.ts";
import { currentAnswers } from "../current-answers.ts";
import { questionWords } from "../questions/asking-clock.ts";
import { asking, type Asking, type AskWords } from "../asking.ts";
import { programResult } from "../execution/program-result.ts";
import type { SurfacePorts } from "../house-ports.ts";
/** A name as the bar says it: with a capital. */
export const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
/** Confirmation tells what will happen and who confirms it, after the declared questions end. */
function confirmation<X extends Program>(ports: SurfacePorts<X>, act: ProgramAct<X>, ask: Asking, tool: string) {
  /** Who confirms is the act's own verb, taken by its initial; what can be undone comes with that verb chosen. */
  const confirm = {
    options: [{ title: act.enter, key: act.enter.charAt(0) }],
    ...(act.undoable ? { reversible: true } : {}),
  };
  /** Under what an act that cannot be undone puts to be confirmed: what it is for, and that it cannot be undone. */
  const note = `${act.purpose} · ${generic.irreversible}`;
  return (answers: readonly string[], target?: string): Field | null => {
    const taken = ask.taken(answers);
    if (answers.length > taken) return null;
    const summary = programCall(
      act.confirms?.bind(act),
      ask.input(answers),
      ports.state(),
      target ?? tool,
      ports.now(),
    );
    /** The purpose is fixed text: it holds whatever the state is, and what depends on the state is said by what
     * the act puts to be confirmed. An act that can be undone adds nothing under it. */
    const warned = act.undoable ? {} : { note };
    if (summary !== undefined) return { ask: summary, kind: "confirm", ...confirm, ...warned };
    /** With nothing asked, the bar already says what is done and to what: what is confirmed is what it is for. */
    const unsafe = act.undoable ? {} : { note: generic.irreversible };
    return taken === 0 ? { ask: capital(act.purpose), kind: "confirm", ...confirm, ...unsafe } : null;
  };
}
export type Asked = Readonly<{ locale: Locale; things: NonNullable<AskWords["things"]> }> &
  /** The day an instant falls on, as the program's country counts them, when the program says how. */
  Readonly<{ day: ((at: number) => string) | undefined }> &
  /** What a thing of a tool is called, for the act that asks to be confirmed on it. */
  Readonly<{ titled: (tool: string, target: string) => string }>;
type Own<X extends Program> = Readonly<{ tool: string; name: string; act: ProgramAct<X> }>;
/** One act as a person walks it: its questions from what it takes, a confirmation when it asks for one, its result. */
export function walked<X extends Program>(ports: SurfacePorts<X>, { tool, name, act }: Own<X>, asked: Asked) {
  const declared = asking(act.input, {
    ...questionWords(ports.now, asked, { state: ports.state, target: tool }),
    things: asked.things,
    cause: reason => declaredCause(act.refuses, reason),
  });
  const ask = {
    ...declared,
    next: currencyQuestions(declared.next, (error, target) => ports.defect(error, tool, target ?? tool, name)),
  };
  const title = act.title ?? capital(act.name);
  const sure = confirmation(ports, act, ask, tool);
  const asks = offeredOn(act, ask, ports.state, tool, ports.now, () => hides(ports.state().house, ports.me, "off"));
  const walk = {
    ...currentAnswers(ask, (target = tool) => programCall(act.today?.bind(act), ports.state(), target, ports.now())),
    label: act.name,
    verb: act.enter,
    key: act.key,
    /** The bar says what is done and, on a thing, to which. */
    title: (target?: string): string => (target === undefined ? title : `${title} · ${asked.titled(tool, target)}`),
    next: (answers: readonly string[], target?: string): Field | null => asks(answers, target) ?? sure(answers, target),
    stops: (answers: readonly string[], target?: string): string | undefined =>
      declaredCause(
        act.refuses,
        programCall(act.stops?.bind(act), ask.sofar(answers), ports.state(), target ?? tool, ports.now()),
      ),
    run: (answers: readonly string[], target: string) => programResult(ports, target, name, ask.submit(answers)),
  };
  return { name, act, ask, walk };
}
