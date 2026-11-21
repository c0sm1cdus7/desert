// Arma marcos visibles con el pedido completo acotado y restaura los cortes durables del hilo propio.
import { diagnoseMindRequest, diagnoseFittedMindRequest } from "./mind-request.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { MindScope, TurnContext } from "../../tools/minds/mind-contract.ts";
import { answerSchema } from "../../tools/minds/mind-answer.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import { buildMindFrame, type FrameSnapshot } from "./mind-frame.ts";
import { fitMindFrame } from "./mind-frame-fit.ts";
import { providerMarginTokens } from "./mind-model-bridge.ts";
import { openMindThreads } from "./mind-thread-store.ts";
import type { MindRuntimeHouse, MindRuntimeOptions, MindSwitches } from "./mind-runtime-options.ts";
import { runtimeView } from "./mind-runtime-view.ts";
import type { MindMenu } from "../../tools/minds/mind-answer.ts";
import type { Event } from "../../journal/vocabulary.ts";
import type { runtimeModel } from "./mind-runtime-model.ts";
import { definitionOf } from "./mind-definitions.ts";
import { wakeWords } from "./wake-words.ts";
import type { MindDefinition } from "../../tools/minds/mind-contract.ts";
export function runtimeFrame<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  switches: MindSwitches,
  model: ReturnType<typeof runtimeModel<X>>,
) {
  const threads = openMindThreads(house.home);
  const entries = (scope: MindScope) => threadEntries(house.history(), scope);
  const thread = (scope: MindScope) => threads.read(scope, entries(scope));
  const read = (scope: MindScope, turn: TurnContext) => {
    const definition = definitionOf(options, house.execution.state().house, scope.actor);
    requireMind(definition, "runtime.definition");
    const view = runtimeView(house, options, switches, scope, definition);
    const snapshot = snapshotFor(view, scope, turn, { options, definition, house }, thread(scope).entries);
    return { view, fitted: fitFrame(snapshot, turn, view.menu, model, options.maxInputTokens) };
  };
  return {
    thread,
    diagnose: (turn: TurnContext) => {
      const { fitted, view } = read(turn.scope, turn);
      return diagnoseFittedMindRequest(model.card(turn.scope.actor)?.card, fitted, answerSchema(view.menu));
    },
    compact: (scope: MindScope, request: Readonly<{ through: number; keep: readonly string[] }>) => {
      requireMind(house.active(), "runtime.active");
      return threads.compact(scope, entries(scope), request);
    },
    frame: (scope: MindScope, turn: TurnContext) => {
      const { fitted, view } = read(scope, turn);
      if (fitted.tooLarge) return fitted;
      const previous = thread(scope);
      if (previous.entries.some(entry => fitted.omitted.includes(entry.id))) {
        threads.compact(scope, entries(scope), {
          through: view.state.through,
          keep: previous.entries.filter(entry => !fitted.omitted.includes(entry.id)).map(entry => entry.id),
        });
      }
      return fitted.frame;
    },
  };
}

export function threadEntries(history: readonly Event[], scope: MindScope) {
  return history.flatMap(event => {
    if (event.by !== scope.actor || event.process !== scope.process || event.layer !== "house") return [];
    let text: string | undefined;
    if (event.kind === "mind-scene" || event.kind === "mind-message" || event.kind === "mind-review-recorded")
      text = event.data.text;
    if (event.kind === "mind-consultation-answered") text = event.data.answer;
    if (event.kind === "mind-consultation-requested") text = event.data.question;
    return text === undefined ? [] : [{ id: event.id, seq: event.seq, text }];
  });
}
function snapshotFor<X extends Program>(
  view: ReturnType<typeof runtimeView<X>>,
  scope: MindScope,
  turn: TurnContext,
  {
    options,
    definition,
    house,
  }: Readonly<{ options: MindRuntimeOptions; definition: MindDefinition; house: MindRuntimeHouse<X> }>,
  thread: FrameSnapshot["thread"],
) {
  const current = view.state.house.minds.turns.get(turn.id);
  const woke = wakeWords(house.history(), view.state.house.journeys, turn.wake, turn.language);
  const scene = view.state.house.minds.scenes.get(scope.process ?? scope.actor)?.data.text ?? "";
  // A consciousness sees the goals of its open journeys, to go back to one or desist from it by its id.
  const open = [...view.state.house.journeys.values()].filter(each => each.by === scope.actor && !each.closed);
  const journeys = scope.kind === "consciousness" ? open.map(({ id, goal, waiting }) => ({ id, goal, waiting })) : [];
  const required = JSON.stringify({
    menu: view.menu,
    journey: scope.process ? view.state.house.journeys.get(scope.process) : undefined,
    ...(journeys.length ? { journeys } : {}),
    invalid: current?.invalid.map(event => event.data.faults),
    answer: current?.answer?.data.answer,
    review: current?.reviews.map(event => event.data.text),
  });
  return buildMindFrame(scope, turn, {
    definition,
    skills: view.skills,
    textRules: options.textRules,
    scene,
    required,
    activity: view.activity,
    objects: view.objects,
    thread,
    now: house.time.now(),
    ...(woke ? { woke } : {}),
  });
}
function fitFrame<X extends Program>(
  snapshot: FrameSnapshot,
  turn: TurnContext,
  menu: MindMenu,
  model: ReturnType<typeof runtimeModel<X>>,
  max: number,
) {
  const assignment = model.card(turn.scope.actor);
  return fitMindFrame(snapshot, turn.language, {
    max,
    bound: frame =>
      new TextEncoder().encode(
        JSON.stringify(
          assignment
            ? diagnoseMindRequest(assignment.card, frame, answerSchema(menu))
            : { frame, schema: answerSchema(menu) },
        ),
      ).length + providerMarginTokens,
  });
}
