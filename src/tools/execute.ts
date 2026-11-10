// One way to act in a house: every act is written, checked against the house, run, and its result written.
import { Value } from "@sinclair/typebox/value";
import { actEnvelope, type Act } from "../catalogs/acts.ts";
import { ids } from "../catalogs/ids.ts";
import { allowed, identityView } from "../house/house.ts";
import { effect, type Bus, type Emission, type HouseEvent } from "../journal/events.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { isAttended, targetTool } from "./attendance.ts";
import { actNews, type ActContext, type ActResult, type KeyStore, type OwnAct } from "./tool-contract.ts";
import type { Product, State, Tool, ToolAct, ToolRegistry } from "./tool-contract.ts";
type Origin = HouseEvent<"act">;
export type Execution<X extends Product> = Readonly<{ bus: Bus<X["fact"]>; keys: KeyStore; now: () => number }> &
  Readonly<{ registry: ToolRegistry<X>; state: () => State<X>; own: (state: State<X>) => readonly OwnAct<X>[] }> &
  Readonly<{ process: (id: string, by?: string) => boolean; live: () => boolean; chain?: readonly string[] }> &
  /** The product's cause for not letting this act run now, when it has one. */
  Readonly<{ refuse?: (state: State<X>, act: Origin, tool: Tool<X> | undefined) => string | undefined }> &
  Readonly<{
    secrets: { capture(value: unknown, registry: ToolRegistry<X>, state?: State<X>): void; scrub<T>(value: T): T };
  }>;
type Decision<X extends Product> = Readonly<{ status: ActResult<X>["status"] | "draft" }> &
  Readonly<{ effects: readonly Emission<X["fact"]>[]; reason?: string; draft?: unknown }> &
  Readonly<{ private?: string | undefined; output?: boolean }>;
type Processing<X extends Product> = Readonly<{ status: "processing"; effects: readonly []; reason?: string }> &
  Readonly<{ completion: Promise<Decision<X>> }>;
export type ExecutionResult<X extends Product> = Decision<X> | Processing<X>;
type Perform<X extends Product> = () => Decision<X> | Promise<Decision<X>>;
const rejected = (reason: string) => ({ status: "rejected" as const, reason, effects: [] });
type Resolving<X extends Product> = Pick<Execution<X>, "state" | "own" | "registry">;
/** The act an identity's act resolves to: one the house offers it directly first, then the target's tool act. */
const resolve = <X extends Product>(ports: Resolving<X>, by: string, target: string, option: string) => {
  const state = identityView(ports.state(), by);
  const offered = ports.own(state).find(act => act.object === target && act.option === option);
  const tool = targetTool(ports.registry, state, target);
  return { state, offered, tool, act: offered ?? tool?.acts[option] };
};
/** Whether an act would leave the house; an act that resolves to nothing never runs. */
export const actReach = <X extends Product>(ports: Resolving<X>, by: string, target: string, option: string) =>
  resolve(ports, by, target, option).act?.reach ?? "house";
function refusal<X extends Product>(ports: Execution<X>, origin: Origin, found: ReturnType<typeof resolve<X>>) {
  const { by, process } = origin;
  const { state, offered, tool, act } = found;
  const target = origin.data.object;
  if (!state.house.grants.has(by) || (process && !ports.process(process, by))) return toolTexts.unassigned;
  if (!act) return toolTexts.unknown;
  if (!offered && (!tool || !allowed(state.house, by, tool.id))) return toolTexts.unassigned;
  const refused = ports.refuse?.(state, origin, offered ? undefined : tool);
  if (refused) return refused;
  if (!offered && !isAttended(state, tool?.id ?? "", target)) return toolTexts.unattended;
  return act.offered?.(state, target);
}
const decide = <X extends Product>(ports: Execution<X>, value: Act, origin: Origin): Decision<X> | Perform<X> => {
  const { by, id } = origin;
  const { object: target, through = 0 } = origin.data;
  const found = resolve(ports, by, target, value.act);
  const { state, offered, tool, act } = found;
  const refused = refusal(ports, origin, found);
  if (refused !== undefined || !act) return rejected(refused ?? toolTexts.unknown);
  const execute = (nested: Act) => executeNested(ports, origin, nested);
  const context: ActContext<X> = { state, by, target, at: ports.now(), through, keys: ports.keys, id, execute };
  const draft = !offered && tool?.draft?.(state, through, value.input, target);
  if (draft) {
    const text = toolTexts.draft;
    const data = { tool: tool?.id ?? "", target: draft, author: by, text, draft: true, detail: value.input };
    return { status: "draft", reason: text, draft: value.input, effects: [effect("tool-entry", data, by)] };
  }
  return () => {
    const result = act.run(value.input, context);
    const finish = (result: ActResult<X>): Decision<X> => ({
      ...decisionOf(result, act, context, offered ? undefined : tool?.id, value.act),
      ...(act.output ? { output: true } : {}),
    });
    return result instanceof Promise ? result.then(finish) : finish(result);
  };
};
async function executeNested<X extends Product>(ports: Execution<X>, origin: Origin, nested: Act) {
  const { by, id, process } = origin;
  const tool = targetTool(ports.registry, identityView(ports.state(), by), nested.target ?? "");
  const chain = [...(ports.chain ?? []), JSON.stringify([origin.data.object, origin.data.option, origin.data.input])];
  const unknown: ActResult<X> = { status: "rejected", reason: toolTexts.unknown };
  if (!tool || chain.includes(JSON.stringify([nested.target, nested.act, nested.input]))) return unknown;
  const cause = [id, ...(process ? [process] : [])];
  const started = execute({ ...ports, chain }, nested, origin.data.through ?? 0, by, cause);
  const result = started.status === "processing" ? await started.completion : started;
  const done: ActResult<X> =
    result.status === "accepted"
      ? { status: "accepted" }
      : { status: "rejected", reason: result.reason ?? toolTexts.invalid };
  return done;
}
/** A private result's act-done goes to its recipient alone, like its entry. */
const privateTo = (recipient?: string) => (recipient ? { recipient } : {});
function decisionOf<X extends Product>(
  result: ActResult<X>,
  act: ToolAct<X>,
  context: ActContext<X>,
  tool: string | undefined,
  option: string,
): Decision<X> {
  if ("reason" in result) return { status: result.status, reason: result.reason, effects: result.effects ?? [] };
  if (result.status === "inconclusive") return { status: "inconclusive", effects: result.effects ?? [] };
  const reason = act.reject?.(context, result);
  if (reason) return rejected(reason);
  if (tool === undefined) return { status: "accepted", effects: result.effects ?? [] };
  const { by, target: original } = context;
  const { text = "", target = original, status: _status, effects = [], private: receipt, ...data } = result;
  const done = effect("act-done", { object: target, act: option, text, ...privateTo(data.recipient) }, by);
  const entry = effect("tool-entry", { tool, target, author: by, text, ...data }, by);
  return { status: "accepted", effects: [...effects, done, entry], private: receipt };
}
const finish = <X extends Product>(ports: Execution<X>, act: Origin, decision: Decision<X>): Decision<X> => {
  const safe = ports.secrets.scrub(decision);
  if (!ports.live()) return safe;
  for (const effect of safe.effects) ports.bus.emit({ ...effect, process: act.process, cause: [act.id] });
  const output = safe.status === "accepted" && safe.output ? { output: true } : {};
  const data = { act: act.id, status: safe.status, reason: safe.reason ?? "", ...output };
  ports.bus.emit(effect("act-result", data, act.by, [act.id], act.process));
  return safe;
};
export function execute<X extends Product>(
  ports: Execution<X>,
  value: unknown,
  through: number,
  by: string,
  cause: readonly string[] = [],
): ExecutionResult<X> {
  ports.secrets.capture(value, ports.registry, ports.state());
  if (!Value.Check(actEnvelope, value)) return rejected(toolTexts.invalid);
  const process = cause.find(id => ports.process(id));
  const data = { object: value.target ?? ids.self, option: value.act, input: value.input, through };
  const act = ports.bus.emit(effect("act", data, by, cause, process));
  const decision = decide(ports, value, act);
  return typeof decision === "function" ? run(ports, act, decision) : finish(ports, act, decision);
}
const run = <X extends Product>(ports: Execution<X>, act: Origin, perform: Perform<X>): ExecutionResult<X> => {
  const { object, option } = act.data;
  const tool = targetTool(ports.registry, identityView(ports.state(), act.by), object)?.id ?? object;
  ports.bus.emit(effect("act-started", { act: act.id, object, option }, act.by, [act.id], act.process));
  /** A thrown Error is the tool's own cause; only a throw without one keeps the last-resort text. */
  const failed = (error: unknown): Decision<X> =>
    rejected(error instanceof Error && error.message ? error.message : toolTexts.unavailable);
  let result: Decision<X> | Promise<Decision<X>>;
  try {
    result = perform();
  } catch (error) {
    return finish(ports, act, failed(error));
  }
  if (!(result instanceof Promise)) return finish(ports, act, result);
  const completion = result.catch(failed).then(decision => {
    if (!ports.live()) return rejected(toolTexts.interrupted);
    const done = finish(ports, act, decision);
    if (actNews({ ...done, output: done.status === "accepted" && done.output }))
      ports.bus.emit(effect("stimulus", { tool }, act.by, [act.id], act.process));
    return done;
  });
  return { status: "processing", effects: [], completion };
};
