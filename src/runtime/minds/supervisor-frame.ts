// Arma los marcos del supervisor: la casa con todos sus programas, lo que se le pide, la mente que consulta y su hilo.
import type { TSchema } from "@sinclair/typebox";
import type { Language } from "../../fields/languages.ts";
import { effectiveKit } from "../../house/kit.ts";
import type { HouseEvent } from "../../house/facts.ts";
import { activeRules } from "../../house/rules/rule-state.ts";
import { systemTool } from "../../house/system-tools.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { frameSection } from "../../texts/mind-frame.texts.ts";
import { supervisorHouse, supervisorLabels, supervisorNotice, supervisorRules } from "../../texts/supervisor.texts.ts";
import { resolve } from "../../tools/execution/action-authority.ts";
import { ruleResults } from "../../tools/execution/mechanical-rules.ts";
import { journeyInputs } from "../../tools/minds/journey-menu.ts";
import type { ProposedAct } from "../../tools/minds/mind-answer.ts";
import type { MindScope } from "../../tools/minds/mind-contract.ts";
import type { ReviewRequest } from "../../tools/minds/mind-review.ts";
import { coreRuleSchema } from "../../tools/rules/rule-core-actions.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { MindFrame } from "./mind-ports.ts";
import { threadEntries } from "./mind-runtime-frame.ts";
import type { MindRuntimeHouse, MindRuntimeOptions } from "./mind-runtime-options.ts";
import { supervisorActor } from "./mind-definitions.ts";
export type RuleResults = ReturnType<typeof ruleResults>;
/** What the active rules say about one proposed act, read without writing: the code applies them at the act. */
export function actRules<X extends Program>(house: MindRuntimeHouse<X>, scope: MindScope, act: ProposedAct) {
  const own = scope.process ?? scope.actor;
  let tool: string | undefined = "journey";
  let schema: TSchema | undefined;
  // A consciousness's resume and desist name one of its own journeys instead of itself.
  const journey = house.execution.state().house.journeys.get(act.target)?.by === scope.actor;
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
const section = (language: Language, index: number, content: string) => {
  const name = supervisorLabels.text(language, {}).split("|")[index];
  if (name === undefined) throw new Error("Rótulo de marco ausente");
  return frameSection.text(language, { name, content });
};
/** The fixed part: who the supervisor is, every program's purpose and the house's rules, text and mechanical. */
function layers<X extends Program>(house: MindRuntimeHouse<X>, options: MindRuntimeOptions, language: Language) {
  const programs = house.execution.registry.filter(tool => !systemTool(tool.id));
  const rules = activeRules(house.execution.state().house.rules).map(
    ({ definition }) => `${definition.id}: ${definition.text}`,
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
/** The collapsed house: every program pinned with its mind's last scene, and every assistant's. */
function collapsed<X extends Program>(house: MindRuntimeHouse<X>) {
  const state = house.execution.state().house;
  const scene = (actor: string) => state.minds.scenes.get(actor)?.data.text ?? "";
  return [
    ...house.execution.registry.filter(tool => !systemTool(tool.id)).map(tool => `mind:${tool.id}`),
    ...[...state.assistants.values()].filter(each => each.enabled).map(each => `assistant:${each.owner}`),
  ]
    .map(actor => `${actor}: ${scene(actor)}`)
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
/** Its own thread: what it learned, then every review the minds recorded, in order. */
function ownThread<X extends Program>(house: MindRuntimeHouse<X>, options: MindRuntimeOptions) {
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
function changing<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  language: Language,
  parts: readonly (readonly [number, string])[],
) {
  const state = house.execution.state();
  const now = house.time.now();
  return [
    section(language, 3, `${supervisorActor} / ${state.through}`),
    section(language, 4, state.house.minds.scenes.get(supervisorActor)?.data.text ?? ""),
    section(language, 5, ownThread(house, options)),
    section(language, 6, collapsed(house)),
    ...parts.map(([index, content]) => section(language, index, content)),
    section(language, 11, `${now} ${new Date(now).toISOString()}`),
  ].join("\n\n");
}
/** The consulting mind's essentials: its journey's goal, plan and kit, its scene and what it did last. */
function consulting<X extends Program>(house: MindRuntimeHouse<X>, scope: MindScope) {
  const state = house.execution.state().house;
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
  const language = options.language;
  const asked = JSON.stringify({ reason: request.reason, acts: request.acts, question: request.question ?? null });
  return {
    layers: layers(house, options, language),
    changing: changing(house, options, language, [
      [7, asked],
      [8, consulting(house, request.scope)],
      [9, rules],
    ]),
  };
}
/** The frame it learns with: the journeys that closed, each with what was reviewed along the way. */
export function learnFrame<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  closed: readonly HouseEvent<"journey-closed">[],
): MindFrame {
  const history = house.history();
  const journeys = closed.map(event => {
    const journey = event.process ? house.execution.state().house.journeys.get(event.process) : undefined;
    const reviews = history.filter(
      (each: Event): each is HouseEvent<"mind-review-recorded"> =>
        each.layer === "house" && each.kind === "mind-review-recorded" && each.process === event.process,
    );
    return JSON.stringify({
      journey: event.process,
      mind: event.by,
      goal: journey?.goal ?? "",
      plan: journey?.steps ?? [],
      ...event.data,
      reviews: reviews.map(each => [each.data.reason, each.data.result, each.data.text]),
    });
  });
  return {
    layers: layers(house, options, options.language),
    changing: changing(house, options, options.language, [[10, journeys.join("\n")]]),
  };
}
