// Builds the supervisor's frames: the house with all its programs, the act that requires supervision or a consultation.
import type { TSchema } from "@sinclair/typebox";
import type { Language } from "../../fields/languages.ts";
import { effectiveKit } from "../../house/kit.ts";
import { activeRules } from "../../house/rules/rule-state.ts";
import { systemTool } from "../../house/system-tools.ts";
import { frameSection } from "../../texts/mind-frame.texts.ts";
import { supervisorHouse, supervisorLabels, supervisorNotice, supervisorRules } from "../../texts/supervisor.texts.ts";
import { resolve } from "../../tools/execution/action-authority.ts";
import { ruleResults } from "../../tools/execution/mechanical-rules.ts";
import { journeyInputs } from "../../tools/minds/journey-menu.ts";
import type { ProposedAct } from "../../tools/minds/mind-answer.ts";
import type { ReviewRequest } from "../../tools/minds/mind-review.ts";
import { coreRuleSchema } from "../../tools/rules/rule-core-actions.ts";
import { ruleDisplay } from "../../tools/rules/rule-display.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { MindFrame } from "./mind-ports.ts";
import { threadEntries } from "./mind-runtime-frame.ts";
import type { MindRuntimeHouse, MindRuntimeOptions } from "./mind-runtime-options.ts";
import { supervisorActor } from "./mind-definitions.ts";
import { shortIds } from "./mind-references.ts";
export type RuleResults = ReturnType<typeof ruleResults>;
/** Who acts: a mind in its scope, or an identity judged alone, by its id. */
type Acting = Readonly<{ actor: string; process?: string | undefined }>;
/** Who a request is about: the identity it names, or the mind that asks. */
export const actingOf = (request: ReviewRequest): Acting => (request.by ? { actor: request.by } : request.scope);
/** What the active rules say about one proposed act, read without writing: the code applies them at the act. */
export function actRules<X extends Program>(house: MindRuntimeHouse<X>, scope: Acting, act: ProposedAct) {
  const own = scope.process ?? scope.actor;
  let tool: string | undefined = "journey";
  let schema: TSchema | undefined;
  // A consciousness's resume and desist, and the supervisor's interrupt, name a journey instead of themselves.
  const journey = house.execution.state().house.journeys.has(act.target);
  if ((act.target === own || journey) && Object.hasOwn(journeyInputs, act.act))
    schema = coreRuleSchema("journey", act.act);
  else if (act.target === scope.actor && act.act === "scene")
    [tool, schema] = ["mind", coreRuleSchema("mind", "scene")];
  else {
    const found = resolve(house.execution, scope.actor, act.target, act.act);
    [tool, schema] = [found.tool?.id, found.act?.input];
  }
  if (!tool || !schema) return [];
  return ruleResults(
    house.execution,
    { by: scope.actor, process: scope.process },
    { tool, act: act.act },
    schema,
    act.input,
  );
}
export const section = (language: Language, index: number, content: string) => {
  const name = supervisorLabels.text(language, {}).split("|")[index];
  if (name === undefined) throw new Error("Rótulo de marco ausente");
  return frameSection.text(language, { name, content });
};
/** The fixed part: who the supervisor is, every program's purpose and the house's rules, text and mechanical. */
export function layers<X extends Program>(house: MindRuntimeHouse<X>, options: MindRuntimeOptions) {
  const { language } = options;
  const programs = house.execution.registry.filter(tool => !systemTool(tool.id));
  const rules = activeRules(house.execution.state().house.rules).map(
    ({ definition: { id, text, action, effect, condition } }) =>
      `${id}: ${text} ${ruleDisplay({ action, effect, condition })}`,
  );
  return [
    supervisorHouse.text(language, {}),
    supervisorRules.text(language, {}),
    section(language, 0, programs.map(tool => `${tool.id}: ${tool.purpose}`).join("\n")),
    [
      section(language, 1, options.textRules.map(rule => `${rule.id}: ${rule.text.text(language, {})}`).join("\n")),
      section(language, 2, rules.join("\n")),
    ].join("\n\n"),
  ] as const;
}
/** Every mind of the house: each program's, then every enabled assistant. */
export function mindsOf<X extends Program>(house: MindRuntimeHouse<X>): readonly string[] {
  const state = house.execution.state().house;
  return [
    ...house.execution.registry.filter(tool => !systemTool(tool.id)).map(tool => `mind:${tool.id}`),
    ...[...state.assistants.values()].filter(each => each.enabled).map(each => `assistant:${each.owner}`),
  ];
}
/** The collapsed house: every program pinned with its mind's last scene, and every assistant's. */
function collapsed<X extends Program>(house: MindRuntimeHouse<X>) {
  const scenes = house.execution.state().house.minds.scenes;
  return mindsOf(house)
    .map(actor => `${actor}: ${scenes.get(actor)?.data.text ?? ""}`)
    .join("\n");
}
/** The newest entries of a thread that fit a quarter of the request, so the supervisor's frame never overflows. */
function tail(entries: readonly Readonly<{ id: string; text: string }>[], budget: number) {
  const kept: string[] = [];
  let used = 0;
  for (const entry of [...entries].reverse()) {
    const line = `${entry.id}: ${entry.text}`;
    used += line.length + 1;
    if (used > budget) break;
    kept.unshift(line);
  }
  return kept.join("\n");
}
/** Its own thread: what it learned, then every verdict and consultation the house recorded, in order. */
export function ownThread<X extends Program>(house: MindRuntimeHouse<X>, options: MindRuntimeOptions) {
  const history = house.history();
  const learned = threadEntries(history, { kind: "consciousness", actor: supervisorActor });
  const reviews = history.flatMap(event =>
    event.layer === "house" && event.kind === "mind-review-recorded"
      ? [
          {
            id: event.id,
            seq: event.seq,
            text: JSON.stringify([event.by, event.data.reason, event.data.result, event.data.text]),
          },
        ]
      : [],
  );
  return tail(
    [...learned, ...reviews].sort((a, b) => a.seq - b.seq),
    Math.floor(options.maxInputTokens / 4),
  );
}
/** Who acts and what it carries: a mind's journey goal, plan and kit, its scene and what it did last; or the
 * identity that acted at a door, with its scene. */
function consulting<X extends Program>(house: MindRuntimeHouse<X>, request: ReviewRequest) {
  const state = house.execution.state().house;
  if (request.by)
    return JSON.stringify({ identity: request.by, scene: state.scenes.get(request.by)?.data.general ?? "" });
  const { scope } = request;
  const journey = scope.process ? state.journeys.get(scope.process) : undefined;
  const last = threadEntries(house.history(), scope).slice(-10);
  return JSON.stringify({
    mind: scope.actor,
    ...(journey ? { journey: journey.id, goal: journey.goal, plan: journey.steps } : {}),
    kit: scope.kind === "journey" ? scope.kit : effectiveKit(state, scope.actor, house.execution.registry),
    scene: state.minds.scenes.get(scope.process ?? scope.actor)?.data.text ?? "",
    activity: last.map(entry => entry.text),
  });
}
export function ruleLines(language: Language, acts: readonly Readonly<{ act: ProposedAct; results: RuleResults }>[]) {
  const lines = acts.flatMap(({ act, results }) =>
    results.map(result =>
      supervisorNotice.text(language, { kind: result.outcome, detail: `${act.act} ${act.target} ${result.id}` }),
    ),
  );
  return lines.length ? lines.join("\n") : supervisorNotice.text(language, { kind: "none", detail: "" });
}
export function reviewFrame<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  request: ReviewRequest,
  rules: string,
): MindFrame {
  const { language } = options;
  const state = house.execution.state();
  const now = house.time.now();
  const asked = JSON.stringify({ reason: request.reason, acts: request.acts, question: request.question ?? null });
  return {
    layers: layers(house, options),
    changing: shortIds(
      [
        section(language, 3, `${supervisorActor} / ${state.through}`),
        section(language, 4, state.house.minds.scenes.get(supervisorActor)?.data.text ?? ""),
        section(language, 5, ownThread(house, options)),
        section(language, 6, collapsed(house)),
        section(language, 7, asked),
        section(language, 8, consulting(house, request)),
        section(language, 9, rules),
        section(language, 11, `${now} ${new Date(now).toISOString()}`),
      ].join("\n\n"),
      new Set(house.history().map(event => event.id)),
    ),
  };
}
