// A declared action as questions and confirmation, preserving the receiver of each program method.
import { programCall } from "../../../fields/program-call.ts";
import { hides } from "../../../house/members.ts";
import { capital } from "../../../texts/capital.ts";
import { wordsIn } from "../../../fields/phrases.ts";
import { genericTexts } from "../../../texts/generic-surface.texts.ts";
import { surfaceTexts } from "../../../texts/surface.texts.ts";
import { declaredCause } from "../../../tools/execution/program-causes.ts";
import type { ProgramAct } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { Field } from "../../contract/contract.ts";
import type { Locale } from "../../formats/masks.ts";
import { offeredOn } from "../picking/picked.ts";
import { say, type SurfacePorts } from "../ports/house-ports.ts";
import { questionWords } from "../questions/asking-clock.ts";
import { asking, type Asking, type AskWords } from "../questions/asking.ts";
import { currencyQuestions } from "../questions/currency-defect.ts";
import { currentAnswers } from "../questions/current-answers.ts";
import { executionDestination } from "./execution-destination.ts";
import { programResult } from "./program-result.ts";
import { rulePresentation } from "./rule-presentation.ts";

/** Confirmation tells what will happen and who confirms it, after the declared questions end. */
function confirmation<X extends Program>(ports: SurfacePorts<X>, act: ProgramAct<X>, ask: Asking, tool: string) {
  /** Who confirms is the act's own verb, taken by its initial; what can be undone comes with that verb chosen. */
  const generic = wordsIn(genericTexts, ports.language);
  const enter = say(ports, act.enter);
  const confirm = {
    options: [{ title: enter, key: enter.charAt(0) }],
    back: wordsIn(surfaceTexts, ports.language).back,
    ...(act.undoable ? { reversible: true } : {}),
  };
  /** Under what an act that cannot be undone puts to be confirmed: what it is for, and that it cannot be undone. */
  const purpose = say(ports, act.purpose);
  const note = `${purpose} · ${generic.irreversible}`;
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
    if (summary !== undefined) return { ask: say(ports, summary), kind: "confirm", ...confirm, ...warned };
    /** With nothing asked, the bar already says what is done and to what: what is confirmed is what it is for. */
    const unsafe = act.undoable ? {} : { note: generic.irreversible };
    return taken === 0 ? { ask: capital(purpose), kind: "confirm", ...confirm, ...unsafe } : null;
  };
}
type Next = (answers: readonly string[], target?: string) => Field | null;
function nextQuestion<X extends Program>(
  asks: Next,
  destination: ReturnType<typeof executionDestination<X>>,
  sure: Next,
  ask: Asking,
  presentation: () => { notice: string } | undefined,
): Next {
  return (answers, target) => {
    const confirmation = () => sure(answers.slice(0, ask.taken(answers)), target);
    const field =
      asks(answers, target) ?? (destination.required ? destination.next(answers, confirmation) : sure(answers, target));
    const notice = presentation()?.notice;
    return field && notice ? { ...field, ask: `${field.ask} · ${notice}` } : field;
  };
}
export type Asked = Readonly<{ locale: Locale; things: NonNullable<AskWords["things"]> }> &
  /** The day an instant falls on, as the program's country counts them, when the program says how. */
  Readonly<{ day: ((at: number) => string) | undefined }> &
  /** What a thing of a tool is called, for the act that asks to be confirmed on it. */
  Readonly<{ titled: (tool: string, target: string) => string }>;
type Own<X extends Program> = Readonly<{ tool: string; name: string; act: ProgramAct<X> }>;
/** The questions of an act, in the reader's language: a question whose currency is wrong says so in its place. */
function askedIn<X extends Program>(ports: SurfacePorts<X>, { tool, name, act }: Own<X>, asked: Asked) {
  const declared = asking(act.input, {
    ...questionWords(ports.now, asked, ports.language, { state: ports.state, target: tool }),
    things: actionThings(ports, act, tool, asked),
    cause: reason => declaredCause(act.refuses, reason),
  });
  const report = (error: unknown, target?: string) => say(ports, ports.defect(error, tool, target ?? tool, name));
  return { ...declared, next: currencyQuestions(declared.next, report, ports.language) };
}
/** Why what was answered so far cannot go on, as the act declares it, in the reader's words. */
const stopsOf =
  <X extends Program>(ports: SurfacePorts<X>, tool: string, act: ProgramAct<X>, ask: Asking) =>
  (answers: readonly string[], target?: string): string | undefined => {
    const sofar = ask.sofar(answers);
    const why = declaredCause(
      act.refuses,
      programCall(act.stops?.bind(act), sofar, ports.state(), target ?? tool, ports.now()),
    );
    return why === undefined ? undefined : say(ports, why);
  };
/** One act as a person walks it: its questions from what it takes, a confirmation when it asks for one, its result. */
export function walked<X extends Program>(ports: SurfacePorts<X>, { tool, name, act }: Own<X>, asked: Asked) {
  const ask = askedIn(ports, { tool, name, act }, asked);
  const title = say(ports, act.title ?? capital(say(ports, act.name)));
  const destination = executionDestination(ports, act, name, ask);
  const presentation = () => rulePresentation(tool, name, ports.state, ports.language);
  const sure = confirmation(ports, act, ask, tool);
  const hidden = () => hides(ports.state().house, ports.me, "off");
  const asks = offeredOn(act, ask, ports.state, tool, ports.now, hidden, ports.language);
  const walk = {
    ...currentAnswers(ask, (target = tool) => programCall(act.today?.bind(act), ports.state(), target, ports.now())),
    label: say(ports, act.name),
    verb: say(ports, act.enter),
    key: act.key,
    /** The bar says what is done and, on a thing, to which. */
    title: (target?: string): string => {
      const shown = presentation()?.name;
      const currentTitle = presentation() ? capital(shown ?? say(ports, act.name)) : title;
      return target === undefined ? currentTitle : `${currentTitle} · ${asked.titled(tool, target)}`;
    },
    next: nextQuestion(asks, destination, sure, ask, presentation),
    stops: stopsOf(ports, tool, act, ask),
    run: (answers: readonly string[], target: string) => {
      const problem = destination.problem(answers);
      return problem
        ? Promise.resolve({ ok: false as const, reason: say(ports, problem) })
        : programResult(ports, target, name, ask.submit(answers), destination.selected(answers));
    },
  };
  return { name, act, ask, walk };
}

function actionThings<X extends Program>(
  ports: SurfacePorts<X>,
  act: ProgramAct<X>,
  tool: string,
  asked: Asked,
): NonNullable<AskWords["things"]> {
  return (source: string, target?: string) => {
    const options = programCall(act.choices?.bind(act), source, ports.state(), target ?? tool);
    if (options === undefined) return asked.things(source, target);
    return {
      found: sought =>
        options
          .map(option => ({ ...option, title: say(ports, option.title) }))
          .filter(option => option.title.toLowerCase().includes(sought.toLowerCase())),
      shown: value => {
        const title = options.find(option => option.value === value)?.title;
        return title === undefined ? value : say(ports, title);
      },
      has: value => options.some(option => option.value === value),
      empty: "",
    };
  };
}
