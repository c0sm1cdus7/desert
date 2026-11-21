// Keeps a mind's cut journey turns in its house scene, without calling a model, until each journey goes on.
import type { Language } from "../../fields/languages.ts";
import { cutText } from "../../fields/text-cut.ts";
import { effect } from "../../house/facts.ts";
import type { House } from "../../house/members.ts";
import type { MindTurn } from "../../house/minds/mind-state.ts";
import { sceneLimits } from "../../house/own-acts.ts";
import { journeyCut } from "../../texts/journey.texts.ts";
import { turnNotice } from "../../texts/mind-turn.texts.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { TurnWake } from "./mind-ports.ts";
import type { MindRuntimeHouse } from "./mind-runtime-options.ts";
type Scenes = Pick<House, "minds" | "journeys">;
/** A cut takes one line of the scene, whatever the goal's length or lines, so it leaves room for the rest. */
const goalLimit = 300;
/** A journey turn that stopped short for anything but a restart, in the words that woke its consciousness. */
function cutLine(state: Scenes, turn: MindTurn, language: Language): string | undefined {
  const closed = turn.closed?.data;
  const goal = state.journeys.get(turn.opened.process ?? "")?.goal;
  if (!closed?.reason || closed.reason === "interrupted" || closed.outcome === "done" || goal === undefined)
    return undefined;
  const line = cutText(goal.replace(/\s+/gu, " ").trim(), goalLimit);
  return journeyCut.text(language, { goal: line, reason: turnNotice.text(language, { reason: closed.reason }) });
}
/** The mind's house scene with a line first for each open journey whose last turn was cut. The line of a cut its
 * journey already went on from, or closed after, leaves the scene; whatever else the scene says stays. */
export function withCuts(state: Scenes, actor: string, language: Language, general: string): string {
  const latest = new Map<string, MindTurn>();
  const gone = new Set<string>();
  for (const turn of state.minds.turns.values()) {
    const { by, process } = turn.opened;
    if (by !== actor || process === undefined) continue;
    const line = cutLine(state, turn, language);
    if (line !== undefined) gone.add(line);
    latest.set(process, turn);
  }
  const cuts = [...latest].flatMap(([process, turn]) => {
    const line = state.journeys.get(process)?.closed ? undefined : cutLine(state, turn, language);
    return line === undefined ? [] : [line];
  });
  const kept = general === "" ? [] : general.split("\n").filter(line => !gone.has(line));
  return cutText([...new Set(cuts), ...kept].join("\n"), sceneLimits.general);
}
/** After each journey turn the mind's house scene says which of its journeys are cut; nothing retries them. */
export function journeyCutScene<X extends Program>(house: MindRuntimeHouse<X>, wake: TurnWake, language: Language) {
  const { scope } = wake;
  if (scope.kind !== "journey" || !house.active()) return;
  const state = house.execution.state().house;
  const closed = state.minds.turns.get(wake.id)?.closed;
  const current = state.scenes.get(scope.actor)?.data;
  const general = withCuts(state, scope.actor, language, current?.general ?? "");
  if (!closed || general === "" || general === current?.general) return;
  house.execution.bus.emit(effect("scene", { general, to: current?.to ?? {} }, scope.actor, [closed.id]));
}
