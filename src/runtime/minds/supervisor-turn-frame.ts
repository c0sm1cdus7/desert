// Builds the frame of the supervisor's own turn: every mind with its journeys, every program, and what woke it.
import type { JourneyState } from "../../house/minds/journey-state.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { turnNotice } from "../../texts/mind-turn.texts.ts";
import { supervisorWoke } from "../../texts/supervisor.texts.ts";
import { answerSchema } from "../../tools/minds/mind-answer.ts";
import type { MindScope } from "../../tools/minds/mind-contract.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { FrameItem } from "./mind-frame.ts";
import { providerMarginTokens } from "./mind-model-bridge.ts";
import type { FramePort, MindFrame } from "./mind-ports.ts";
import { diagnoseMindRequest } from "./mind-request.ts";
import type { MindRuntimeHouse, MindRuntimeOptions } from "./mind-runtime-options.ts";
import type { runtimeModel } from "./mind-runtime-model.ts";
import type { runtimeView } from "./mind-runtime-view.ts";
import { supervisorActor } from "./mind-definitions.ts";
import { layers, mindsOf, ownThread, section } from "./supervisor-frame.ts";
type View = ReturnType<typeof runtimeView>;
/** How many turns of each journey closed with a reason: a fact the supervisor reads, never a limit. */
function cutsByJourney(history: readonly Event[]): ReadonlyMap<string, number> {
  const cuts = new Map<string, number>();
  for (const e of history)
    if (e.layer === "house" && e.kind === "mind-turn-closed" && e.process && e.data.reason !== undefined)
      cuts.set(e.process, (cuts.get(e.process) ?? 0) + 1);
  return cuts;
}
/** One item per mind: its scene, and each open journey with its goal, plan, wait, cuts and whether it is stopped;
 * a mind no longer in the house (a disabled assistant) still shows the journeys it left open. */
function houseItems<X extends Program>(house: MindRuntimeHouse<X>): FrameItem[] {
  const state = house.execution.state().house;
  const cuts = cutsByJourney(house.history());
  const open = [...state.journeys.values()].filter(journey => !journey.closed);
  const journey = ({ id, goal, steps, waiting, interrupted }: JourneyState) => ({
    id,
    goal,
    plan: steps,
    ...(waiting ? { waiting } : {}),
    cuts: cuts.get(id) ?? 0,
    ...(interrupted ? { interrupted } : {}),
  });
  return [...new Set([...mindsOf(house), ...open.map(each => each.by)])].map(actor => ({
    id: actor,
    text: JSON.stringify({
      scene: state.minds.scenes.get(actor)?.data.text ?? state.scenes.get(actor)?.data.general ?? "",
      journeys: open.filter(each => each.by === actor).map(journey),
    }),
  }));
}
/** Each waking fact in words: a journey that ended or desisted, a cut or failed turn, somebody who spoke to it. */
function woke<X extends Program>(house: MindRuntimeHouse<X>, options: MindRuntimeOptions, wake: readonly string[]) {
  const { language } = options;
  const journeys = house.execution.state().house.journeys;
  const events = new Map(house.history().flatMap(event => (wake.includes(event.id) ? [[event.id, event]] : [])));
  return wake.map(id => {
    const event = events.get(id);
    const message = event && options.message(event);
    if (message)
      return supervisorWoke.text(language, { kind: "spoken", who: message.by, goal: "", detail: message.text });
    if (event?.layer !== "house") return id;
    const goal = event.process ? (journeys.get(event.process)?.goal ?? event.process) : "";
    if (event.kind === "journey-closed" && event.process) {
      const kind = event.data.outcome === "done" ? "done" : "desisted";
      return supervisorWoke.text(language, { kind, who: event.by, goal, detail: event.data.summary });
    }
    if (event.kind !== "mind-turn-closed" || !event.data.reason) return id;
    const detail = turnNotice.text(language, { reason: event.data.reason });
    // A closed turn with no process is a consciousness's own: no journey to name, only the mind that failed.
    return supervisorWoke.text(language, { kind: event.process ? "cut" : "failed", who: event.by, goal, detail });
  });
}
const render = (items: readonly FrameItem[]) => items.map(item => `${item.id}: ${item.text}`).join("\n");
type Parts = Readonly<{ minds: FrameItem[]; activity: FrameItem[]; omitted: string[] }>;
function frameOf<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  fixed: Readonly<{ woke: string; context: string; scene: string; thread: string }>,
  parts: Parts,
): MindFrame {
  const { language } = options;
  const now = house.time.now();
  return {
    layers: layers(house, options),
    changing: [
      section(language, 3, `${supervisorActor} / ${house.execution.state().through}`),
      section(language, 4, fixed.scene),
      section(language, 5, fixed.thread),
      section(language, 6, render(parts.minds)),
      section(language, 10, fixed.woke),
      section(language, 13, render(parts.activity)),
      section(language, 12, fixed.context),
      section(language, 11, `${now} ${new Date(now).toISOString()}`),
      ...(parts.omitted.length ? [section(language, 14, parts.omitted.join(", "))] : []),
    ].join("\n\n"),
  };
}
/** The frame fits the request: what it read in threads goes first, then minds from the first, each one named. */
function fit(frame: (parts: Parts) => MindFrame, parts: Parts, fits: (frame: MindFrame) => boolean) {
  let current = frame(parts);
  while (!fits(current)) {
    const item = parts.activity.shift() ?? parts.minds.shift();
    if (!item) return { tooLarge: true as const };
    parts.omitted.push(item.id);
    current = frame(parts);
  }
  return current;
}
export function supervisorTurnFrame<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  model: ReturnType<typeof runtimeModel<X>>,
  view: (scope: MindScope) => View,
): FramePort {
  return (scope, turn) => {
    const current = view(scope);
    const schema = answerSchema(current.menu);
    const card = model.card(supervisorActor)?.card;
    const size = (frame: MindFrame) =>
      new TextEncoder().encode(JSON.stringify(card ? diagnoseMindRequest(card, frame, schema) : { frame, schema }))
        .length + providerMarginTokens;
    const fixed = {
      woke: woke(house, options, turn.wake).join("\n"),
      context: JSON.stringify({ menu: current.menu }),
      scene: house.execution.state().house.minds.scenes.get(supervisorActor)?.data.text ?? "",
      thread: ownThread(house, options),
    };
    const activity = [...current.activity, ...current.objects].map(({ id, text }) => ({ id, text }));
    const parts: Parts = { minds: houseItems(house), activity, omitted: [] };
    return fit(
      each => frameOf(house, options, fixed, each),
      parts,
      frame => size(frame) <= options.maxInputTokens,
    );
  };
}
