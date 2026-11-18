// One way to act in a house: every act is written, checked against the house, run, and its result written.
import { normalizedInput, withPreparedInput } from "./inputs/prepared-input.ts";
import { reviewWorld } from "./execution/review-world.ts";
import { MechanicalRuleFailure } from "./rules/rule-failure.ts";
import { ruleCapabilities } from "./execution/rule-capabilities.ts";
import { mechanicalRules, enforceMechanical } from "./execution/mechanical-rules.ts";
import type { ContractFailureReason } from "./contract-port.ts";
import { hasSecretInput, executionSchema } from "./inputs/secret-input.ts";
import { rejected, performAct } from "./execution/perform-act.ts";
import { runningSignal } from "./execution/running-acts.ts";
import { checkedDecision } from "./execution/action-decision.ts";
import { actionDraft } from "./execution/action-draft.ts";
import { Value } from "@sinclair/typebox/value";
import { actEnvelope, type Act } from "../house/own-acts.ts";
import { ids } from "../house/ids.ts";
import { allowedAct, present } from "../house/kit.ts";
import { identityView } from "../house/members.ts";
import { effect, type HouseEvent } from "../house/facts.ts";
import type { Emission } from "../journal/vocabulary.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { isAttended, targetTool } from "../house/attendance.ts";
import { programOffered, runProgram } from "./program-run.ts";
import { startAct } from "./failures/start-act.ts";
import { finish } from "./failures/finish.ts";
import type { ActContext, ActResult, Program, Tool, ToolAct } from "./tool-contract.ts";
import type { Execution } from "./execution-contract.ts";
import type { ToolCapabilities } from "./capabilities-contract.ts";
import { usingCapabilities } from "./execution/action-capabilities.ts";
export type { Execution } from "./execution-contract.ts";
import { isMindActor, parseMindActor } from "../fields/mind-actor.ts";
import { journeyAllows } from "../house/minds/journey-state.ts";
type Origin = HouseEvent<"act">;
export type Decision<X extends Program> = Readonly<{ status: ActResult<X>["status"] | "draft" }> &
  Readonly<{ value?: unknown; coreFailure?: ContractFailureReason }> &
  Readonly<{ effects: readonly Emission<X["fact"]>[]; reason?: string; draft?: unknown; defect?: true }> &
  Readonly<{ private?: string | undefined; output?: boolean; cleanupPending?: true; anchorPending?: true }>;
type Processing<X extends Program> = Readonly<{ status: "processing"; effects: readonly []; reason?: string }> &
  Readonly<{ completion: Promise<Decision<X>> }>;
export type ExecutionResult<X extends Program> = Decision<X> | Processing<X>;
type Perform<X extends Program> = () => Decision<X> | Promise<Decision<X>>;

type Resolving<X extends Program> = Pick<Execution<X>, "state" | "own" | "registry">;
/** The act an identity's act resolves to: one the house offers it directly first, then the target's tool act. */
const resolve = <X extends Program>(ports: Resolving<X>, by: string, target: string, option: string) => {
  const state = identityView(ports.state(), by);
  const offered = ports
    .own(state)
    .find(
      act =>
        act.object === target &&
        act.option === option &&
        (!isMindActor(by) || (target === ids.self && option === "scene")),
    );
  const tool = targetTool(ports.registry, state, target);
  return { state, offered, tool, act: offered ?? tool?.acts[option] };
};
/** Whether an act would leave the house; an act that resolves to nothing never runs. */
export const actReach = <X extends Program>(ports: Resolving<X>, by: string, target: string, option: string) =>
  resolve(ports, by, target, option).act?.reach ?? "house";
/** An act that says where it stands is done there: on its tool itself, or on one of its tool's things. */
const elsewhere = <X extends Program>(act: ToolAct<X>, tool: Tool<X>, target: string): boolean =>
  act.on !== undefined && (act.on === "tool") !== (target === tool.id);
function refusal<X extends Program>(ports: Execution<X>, origin: Origin, found: ReturnType<typeof resolve<X>>) {
  const { by, process } = origin;
  const { state, offered, tool, act } = found;
  const target = origin.data.object;
  if (!present(ports.registry, state.house, by) || (process && !ports.process(process, by)))
    return toolTexts.unassigned;
  if (!act) return toolTexts.unknown;
  if (origin.data.reaction && act.reach !== "house") return toolTexts.invalid;
  if (!offered && (!tool || !allowedAct(state.house, by, tool.id, origin.data.option, ports.registry)))
    return toolTexts.kitRefusal(tool?.id ?? "");
  if (!offered && tool && elsewhere(act, tool, target)) return toolTexts.unknown;
  if (
    process &&
    state.house.journeys.has(process) &&
    (!tool ||
      !journeyAllows(
        state.house.journeys,
        process,
        by,
        tool.id,
        origin.data.option,
        state.house.kitLayout,
        state.house.kitMigration,
      ))
  )
    return toolTexts.outsideKit;
  if (!offered && !isMindActor(by) && !isAttended(state, tool?.id ?? "", target)) return toolTexts.unattended;
  return programOffered(act, state, target, ports.now());
}
const decide = <X extends Program>(
  ports: Execution<X>,
  value: Act,
  origin: Origin,
  capabilities: ToolCapabilities,
  reviewed = false,
): Decision<X> | Perform<X> => {
  const { by } = origin;
  const { object: target } = origin.data;
  const found = resolve(ports, by, target, value.act);
  const { offered, tool, act } = found;
  const refused = refusal(ports, origin, found);
  if (refused !== undefined || !act)
    return { ...rejected(refused ?? toolTexts.unknown), coreFailure: act ? "forbidden" : "invalid-reference" };
  if (!Value.Check(executionSchema(act.input), value.input)) return rejected(toolTexts.invalid);
  const mechanical = mechanicalRules(
    ports,
    origin,
    { tool: tool?.id ?? target, act: value.act },
    act.input,
    value.input,
  );
  if (mechanical) return mechanical;
  const context = actionContext(ports, origin, found, capabilities);
  const draft = !offered && actionDraft(tool, context, value.input);
  if (draft) return draft;
  if (!reviewed && act.reach === "world" && ports.review && parseMindActor(by))
    return () =>
      reviewWorld(ports, value, origin, context.signal, () => {
        const current = decide(ports, value, origin, capabilities, true);
        return typeof current === "function" ? current() : current;
      });
  return () => {
    const result = withPreparedInput(context, () => runProgram(act, value.input, context));
    const finish = (result: ActResult<X>): Decision<X> =>
      checkedDecision(ports, result, act, context, tool, offered, value.act, value.input);
    return result instanceof Promise ? result.then(finish) : finish(result);
  };
};
function actionContext<X extends Program>(
  ports: Execution<X>,
  origin: Origin,
  found: ReturnType<typeof resolve<X>>,
  capabilities: ToolCapabilities,
): ActContext<X> {
  const { state, offered, tool, act } = found;
  const { by, id } = origin;
  const { object: target, through = 0 } = origin.data;
  const check = () => {
    const current = resolve(ports, by, target, origin.data.option);
    const denied = refusal(ports, origin, current);
    if (denied || !current.act) throw new MechanicalRuleFailure(denied ?? toolTexts.unknown, []);
    enforceMechanical(ports, origin, current.tool?.id ?? target, current.act.input);
  };
  const { ports: publicPorts, credentials } = ruleCapabilities(capabilities, check);
  const context: ActContext<X> = {
    state,
    signal: runningSignal(ports, origin, offered ? undefined : tool?.id, act?.reach ?? "house"),
    by,
    target,
    at: ports.now(),
    through,
    ports: publicPorts,
    credentials,
    id,
    ...(origin.data.reaction
      ? {}
      : {
          execute: (nested: Act) => {
            check();
            return executeNested(ports, origin, nested);
          },
        }),
  };
  return attachContracts(ports, origin, context, tool?.id ?? "", check);
}
function attachContracts<X extends Program>(
  ports: Execution<X>,
  origin: Origin,
  context: ActContext<X>,
  tool: string,
  check: () => void,
): ActContext<X> {
  if (origin.data.reaction) return context;
  Object.assign(
    context,
    ports.contracts?.({
      tool,
      by: origin.by,
      signal: context.signal,
      execute: nested => {
        check();
        return executeNested(ports, origin, nested);
      },
      alive: () => ports.live() && ports.active?.closed !== true,
    }),
  );
  return context;
}

async function executeNested<X extends Program>(
  ports: Execution<X>,
  origin: Origin,
  nested: Act,
): Promise<ActResult<X>> {
  if (ports.active?.controller.signal.aborted) return { status: "interrupted", reason: toolTexts.withdrawn };
  const { by, id, process } = origin;
  const tool = targetTool(ports.registry, identityView(ports.state(), by), nested.target ?? "");
  const unknown: ActResult<X> = { status: "rejected", reason: toolTexts.unknown };
  if (!tool) return { ...unknown, coreFailure: "invalid-reference" };
  const parent = process ? (ports.state().house.journeys.get(process)?.opened ?? process) : undefined;
  const cause = [id, ...(parent ? [parent] : [])];
  const started = execute(ports, nested, origin.data.through ?? 0, by, cause);
  const result = started.status === "processing" ? await started.completion : started;
  let done: ActResult<X>;
  if (result.status === "accepted") done = { status: "accepted" };
  else if (result.status === "inconclusive") done = { status: "inconclusive" };
  else
    done = {
      status: result.status === "interrupted" ? "interrupted" : "rejected",
      reason: result.reason ?? toolTexts.invalid,
    };
  const failure: ContractFailureReason | undefined = result.defect ? "defect" : result.coreFailure;
  return {
    ...done,
    ...(result.value !== undefined ? { value: result.value } : {}),
    ...(failure ? { coreFailure: failure } : {}),
    ...(result.cleanupPending ? { cleanupPending: true } : {}),
    ...(result.anchorPending ? { anchorPending: true } : {}),
  };
}
export function execute<X extends Program>(
  ports: Execution<X>,
  value: unknown,
  through: number,
  by: string,
  cause: readonly string[] = [],
  reaction?: Origin["data"]["reaction"],
): ExecutionResult<X> {
  if (!Value.Check(actEnvelope, value)) return rejected(toolTexts.invalid);
  const key = JSON.stringify([value.target, value.act, value.input]);
  if (ports.chain?.includes(key)) return rejected(toolTexts.unknown);
  const chain = [...(ports.chain ?? []), key];
  const work = (ports: Execution<X>, input: unknown, valid: boolean, capabilities: ToolCapabilities) =>
    executeScoped({ ...ports, chain }, { ...value, input }, through, by, cause, capabilities, valid, reaction);
  const schema = resolve(ports, by, value.target ?? ids.self, value.act).act?.input;
  const plain = !hasSecretInput(schema);
  return usingCapabilities(ports, { by, data: { object: value.target ?? ids.self } }, (scoped, capabilities) =>
    ports.secrets.scope
      ? ports.secrets.scope(
          schema,
          value.input,
          (input, valid) => work(scoped, input, valid, capabilities),
          scoped.credentialEffects?.capture,
          (ports.chain?.length ?? 0) > 0,
        )
      : work(scoped, plain ? value.input : "[secret]", plain, capabilities),
  );
}
function executeScoped<X extends Program>(
  ports: Execution<X>,
  value: Act,
  through: number,
  by: string,
  cause: readonly string[],
  capabilities: ToolCapabilities,
  valid: boolean,
  reaction?: Origin["data"]["reaction"],
): ExecutionResult<X> {
  const journeys = ports.state().house.journeys;
  const journey = [...journeys.values()].find(each => cause.includes(each.opened));
  const process = reaction
    ? undefined
    : (ports.mindScope?.process ?? journey?.id ?? cause.find(id => ports.process(id)));
  if (ports.mindScope && ports.mindScope.actor !== by) return rejected(toolTexts.unassigned);
  const data = {
    object: value.target ?? ids.self,
    option: value.act,
    input: value.input,
    through,
    ...(reaction ? { reaction } : {}),
  };
  const started = startAct(ports, effect("act", data, by, cause, process));
  if (started.failed) return started.failed;
  const act = started.act;
  if (!valid) return finish(ports, act, rejected(toolTexts.invalid));
  let decision: Decision<X> | Perform<X>;
  try {
    const action = resolve(ports, by, data.object, value.act).act;
    const input = action ? normalizedInput(action, value.input) : value.input;
    decision = decide(ports, { ...value, input }, { ...act, data: { ...act.data, input } }, capabilities);
  } catch (error) {
    return performAct(ports, act, () => {
      throw error;
    });
  }
  return typeof decision === "function" ? performAct(ports, act, decision) : finish(ports, act, decision);
}
