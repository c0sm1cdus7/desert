// Builds closed answers from the menu and checks proposal, destination, scope and current permission.
import { executionDestination, type ExecutionDestination } from "../../fields/device-protocol.ts";
import { destinationFields, destinationAllowed } from "./device-answer.ts";
import { Type, type Static, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { object } from "../../fields/visible-text.ts";
import { mindText } from "../../house/minds/journey-facts.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import { closedAnswerInput } from "./answer-schema.ts";
import type { MindScope } from "./mind-contract.ts";
export type ProposedAct = Readonly<{ act: string; target: string; input: unknown; destination?: ExecutionDestination }>;
export type MindAnswer = Readonly<{
  scene: string;
  consulta: Readonly<{ question: string }> | null;
  acts: readonly ProposedAct[];
}>;
export type MindMenu = readonly Readonly<{
  tool: string;
  act: string;
  target: string;
  input: TSchema;
  destinations?: readonly ExecutionDestination[];
  scope: "communication" | "open" | "work" | "control";
}>[];
export type AnswerFault = Readonly<{ code: string; path: string }>;
export type AnswerContext = Readonly<{
  menu: MindMenu;
  scope: MindScope;
  consulted: boolean;
  active: boolean;
  allowed: (proposal: ProposedAct) => boolean;
}>;
const shape = object({
  scene: mindText,
  consulta: Type.Union([object({ question: mindText }), Type.Null()]),
  acts: Type.Array(
    object({
      act: Type.String(),
      target: Type.String(),
      input: Type.Unknown(),
      destination: Type.Optional(executionDestination),
    }),
    { maxItems: 32 },
  ),
});
/** The model adapter reduces transport-only constraints; this schema retains the complete local contract. */
export function answerSchema(menu: MindMenu): TSchema {
  requireMind(Array.isArray(menu), "menu");
  const acts = menu.map((item: MindMenu[number]) =>
    object({
      act: Type.Literal(item.act),
      target: Type.Literal(item.target),
      input: closedAnswerInput(item.input),
      ...destinationFields(item.destinations),
    }),
  );
  return object({
    scene: mindText,
    consulta: Type.Union([object({ question: mindText }), Type.Null()]),
    acts: Type.Array(acts.length ? Type.Union(acts) : Type.Never(), { maxItems: 32 }),
  });
}
const permittedScope = (context: AnswerContext, item: MindMenu[number]): boolean => {
  if (context.scope.kind === "consciousness")
    return (
      item.scope === "communication" || item.scope === "open" || (item.scope === "control" && item.tool === "journey")
    );
  return (
    item.scope === "control" ||
    (item.scope === "work" && context.scope.kit.some(each => each.tool === item.tool && each.acts.includes(item.act)))
  );
};
/** A journey's own wait, end or desist: the only acts that close a journey turn, and only as its last act. */
export const continuation = (item: MindMenu[number] | undefined): boolean =>
  item?.tool === "journey" && item.scope === "control" && ["wait", "end", "desist"].includes(item.act);
/** A journey answer says how it goes on: no continuation before the last act, and never nothing at all. */
function continuationFaults(value: Static<typeof shape>, context: AnswerContext): AnswerFault[] {
  if (context.scope.kind !== "journey" || value.consulta) return [];
  if (!value.acts.length) return [{ code: "continuation", path: "/acts" }];
  return value.acts.flatMap((act, index) =>
    index < value.acts.length - 1 &&
    continuation(context.menu.find(item => item.act === act.act && item.target === act.target))
      ? [{ code: "continuation", path: `/acts/${index}` }]
      : [],
  );
}
export function validateAnswer(
  value: unknown,
  context: AnswerContext,
): Readonly<{ ok: true; answer: MindAnswer }> | Readonly<{ ok: false; faults: readonly AnswerFault[] }> {
  requireMind(context, "context");
  if (!Value.Check(shape, value))
    return { ok: false, faults: [...Value.Errors(shape, value)].map(error => ({ code: "shape", path: error.path })) };
  const faults: AnswerFault[] = continuationFaults(value, context);
  if (!context.active) faults.push({ code: "closed", path: "/acts" });
  if (value.consulta && context.consulted) faults.push({ code: "consultation", path: "/consulta" });
  value.acts.forEach((act, index) => {
    const item = context.menu.find(item => item.act === act.act && item.target === act.target);
    const path = `/acts/${index}`;
    if (!item) faults.push({ code: "menu", path });
    else if (!Value.Check(closedAnswerInput(item.input), act.input))
      faults.push({ code: "input", path: `${path}/input` });
    else if (!destinationAllowed(item.destinations, act.destination)) faults.push({ code: "destination", path });
    else if (!permittedScope(context, item)) faults.push({ code: "scope", path });
    else if (!context.allowed(act)) faults.push({ code: "permission", path });
  });
  return faults.length ? { ok: false, faults } : { ok: true, answer: value };
}
