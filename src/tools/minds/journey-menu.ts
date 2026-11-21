// Offers communication or authorized work and own controls according to each journey's state.
import type { KitMigration } from "../../house/kit-migration.ts";
import { journeyAllows } from "../../house/minds/journey-state.ts";
import type { KitLayout } from "../../house/kit-selection.ts";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { Language } from "../../fields/languages.ts";
import { mindActor } from "../../fields/mind-actor.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import { object } from "../../fields/visible-text.ts";
import { delegatedKit, type DelegatedKit } from "../../house/assistants/assistant-facts.ts";
import { journeyFacts, mindText } from "../../house/minds/journey-facts.ts";
import type { Journeys, JourneyState } from "../../house/minds/journey-state.ts";
import { journeyControlPurpose } from "../../texts/journey.texts.ts";
import { ids } from "../../house/ids.ts";
import type { MindMenu } from "./mind-answer.ts";
import type { MindScope } from "./mind-contract.ts";
export const journeyInputs = {
  open: journeyFacts["journey-opened"],
  plan: journeyFacts["journey-plan-written"],
  done: journeyFacts["journey-step-done"],
  wait: journeyFacts["journey-waiting"],
  resume: journeyFacts["journey-resumed"],
  interrupt: journeyFacts["journey-interrupted"],
  end: object({ summary: mindText, references: journeyFacts["journey-closed"].properties.references }),
  desist: object({ reason: mindText, references: journeyFacts["journey-closed"].properties.references }),
};
export type JourneyControl = keyof typeof journeyInputs;
/** These are current effective permissions, not the kit previously shown to the model. */
export type JourneyAccess = Readonly<{
  journeys: Journeys;
  layout?: KitLayout;
  migration?: KitMigration;
  kit: DelegatedKit;
  active: boolean;
  pending: readonly Readonly<{ by: string; process?: string | undefined }>[];
}>;
export type JourneyMenuState = JourneyAccess &
  Readonly<{
    menu: MindMenu;
    communication: readonly Readonly<{ tool: string; act: string }>[];
  }>;
export type JourneyMenu = readonly (MindMenu[number] & Readonly<{ purpose?: string }>)[];
export const kitIncludes = (kit: DelegatedKit, tool: string, act: string): boolean =>
  kit.some(item => item.tool === tool && item.acts.includes(act));
/** Whether an act of this mind in this journey is still running, so the journey cannot close under it. */
export const pendingIn = (state: JourneyAccess, actor: string, process: string): boolean =>
  state.pending.some(item => item.by === actor && item.process === process);
export const journeyPending = (scope: MindScope, state: JourneyAccess): boolean =>
  scope.kind === "journey" && pendingIn(state, scope.actor, scope.process);
export function validateJourneyAccess(scope: MindScope, state: JourneyAccess): void {
  requireMind(scope, "scope");
  requireMind(Value.Check(mindActor, scope.actor), "scope.actor");
  requireMind(
    Value.Check(Type.Union([Type.Literal("consciousness"), Type.Literal("journey")]), scope.kind),
    "scope.kind",
  );
  requireMind(state, "state");
  requireMind(state.journeys, "state.journeys");
  requireMind(typeof state.journeys.get === "function", "state.journeys.get");
  requireMind(Value.Check(delegatedKit, state.kit), "state.kit");
  requireMind(typeof state.active === "boolean", "state.active");
  requireMind(Array.isArray(state.pending), "state.pending");
  if (scope.kind === "journey") {
    requireMind(
      typeof scope.process === "string" && scope.process !== scope.actor && scope.process.trim(),
      "scope.process",
    );
    requireMind(Value.Check(delegatedKit, scope.kit), "scope.kit");
  } else requireMind(Value.Check(Type.Undefined(), scope.process), "scope.process");
}
type OwnControl = Readonly<{ act: JourneyControl; target: string }>;
/** A consciousness opens journeys, and over each of its open journeys it can go back to it or desist from it. The
 * house supervisor opens none and acts on no program: over every open journey of any mind it can only interrupt. */
function oversight(scope: MindScope, state: JourneyAccess): OwnControl[] {
  const live = [...state.journeys.values()].filter(journey => !journey.closed);
  if (scope.actor === ids.supervisor) return live.map(({ id }) => ({ act: "interrupt", target: id }));
  const open = live.filter(journey => journey.by === scope.actor);
  return [
    { act: "open", target: scope.actor },
    ...open.flatMap(({ id }): OwnControl[] => [
      { act: "resume", target: id },
      ...(pendingIn(state, scope.actor, id) ? [] : [{ act: "desist" as const, target: id }]),
    ]),
  ];
}
function controls(scope: MindScope, state: JourneyAccess, journey: JourneyState | undefined): OwnControl[] {
  if (scope.kind === "consciousness") return oversight(scope, state);
  requireMind(journey, "journey.active");
  const result: JourneyControl[] = [];
  if (!journey.planned) result.push("plan");
  if (journey.steps.some(step => step.note === undefined)) result.push("done");
  result.push("wait");
  if (!journeyPending(scope, state)) result.push("end", "desist");
  return result.map(act => ({ act, target: scope.process }));
}
/** The caller routes scope open/control to the turn; these entries are not tool acts. */
export function journeyMenu(scope: MindScope, state: JourneyMenuState, language: Language): JourneyMenu {
  validateJourneyAccess(scope, state);
  requireMind(Array.isArray(state.menu), "state.menu");
  requireMind(Array.isArray(state.communication), "state.communication");
  requireMind(Value.Check(Type.Literal("es"), language), "language");
  if (!state.active) return [];
  const journey = scope.kind === "journey" ? state.journeys.get(scope.process) : undefined;
  if (scope.kind === "journey" && (!journey || journey.closed || journey.by !== scope.actor)) return [];
  const work = state.menu
    .filter((item: MindMenu[number]) => permittedItem(scope, state, journey, item))
    .map((item: MindMenu[number]) => ({
      ...item,
      scope: scope.kind === "journey" ? ("work" as const) : ("communication" as const),
    }));
  const own = controls(scope, state, journey).map(({ act, target }) => ({
    tool: "journey",
    act,
    target,
    input: journeyInputs[act],
    scope: act === "open" ? ("open" as const) : ("control" as const),
    purpose: journeyControlPurpose.text(language, { control: act }),
  }));
  const result = [...work, ...own];
  requireMind(new Set(result.map(item => JSON.stringify([item.act, item.target]))).size === result.length, "menu");
  return result;
}
function permittedItem(
  scope: MindScope,
  state: JourneyMenuState,
  journey: JourneyState | undefined,
  item: MindMenu[number],
): boolean {
  if (item.scope !== "work" && item.scope !== "communication") return false;
  if (!kitIncludes(state.kit, item.tool, item.act)) return false;
  if (scope.kind === "consciousness")
    return state.communication.some(each => each.tool === item.tool && each.act === item.act);
  return (
    !!journey &&
    journeyAllows(state.journeys, journey.id, scope.actor, item.tool, item.act, state.layout, state.migration) &&
    kitIncludes(scope.kit, item.tool, item.act)
  );
}
