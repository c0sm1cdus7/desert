// One way to act in a house: every act is written, checked against the house, run, and its result written.
import { Value } from "@sinclair/typebox/value";
import { parseMindActor } from "../fields/mind-actor.ts";
import { effect, type HouseEvent } from "../house/facts.ts";
import { ids } from "../house/ids.ts";
import { actEnvelope, type Act } from "../house/own-acts.ts";
import type { Emission } from "../journal/vocabulary.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import type { ToolCapabilities } from "./capabilities-contract.ts";
import type { ContractFailureReason } from "./contract-port.ts";
import type { Execution } from "./execution-contract.ts";
import { usingCapabilities } from "./execution/action-capabilities.ts";
import { checkedDecision } from "./execution/action-decision.ts";
import { resolve, refusal, type Resolving } from "./execution/action-authority.ts";
import { actionDraft } from "./execution/action-draft.ts";
import { deviceRun, executionReach } from "./execution/device-execution.ts";
import { asksJudgment, enforceMechanical, mechanicalRules } from "./execution/mechanical-rules.ts";
import { executeNested } from "./execution/nested-execution.ts";
import { performAct, rejected } from "./execution/perform-act.ts";
import { reviewWorld } from "./execution/review-world.ts";
import { ruleCapabilities } from "./execution/rule-capabilities.ts";
import { runningSignal } from "./execution/running-acts.ts";
import { finish } from "./failures/finish.ts";
import { startAct } from "./failures/start-act.ts";
import { normalizedInput, withPreparedInput } from "./inputs/prepared-input.ts";
import { executionSchema, hasSecretInput } from "./inputs/secret-input.ts";
import { runProgram } from "./program-run.ts";
import { MechanicalRuleFailure } from "./rules/rule-failure.ts";
import { prepareSimulationAct } from "./rules/simulation-public-input.ts";
import type { ActContext, ActResult, Program } from "./tool-contract.ts";
export type { Execution } from "./execution-contract.ts";
type Origin = HouseEvent<"act">;
export type Decision<X extends Program> = Readonly<{ status: ActResult<X>["status"] | "draft" }> &
  Readonly<{ value?: unknown; coreFailure?: ContractFailureReason }> &
  Readonly<{ effects: readonly Emission<X["fact"]>[]; reason?: string; draft?: unknown; defect?: true }> &
  Readonly<{ private?: string | undefined; output?: boolean; cleanupPending?: true; anchorPending?: true }>;
type Processing<X extends Program> = Readonly<{ status: "processing"; effects: readonly []; reason?: string }> &
  Readonly<{ completion: Promise<Decision<X>> }>;
export type ExecutionResult<X extends Program> = Decision<X> | Processing<X>;
type Perform<X extends Program> = () => Decision<X> | Promise<Decision<X>>;

/** Whether an act would leave the house; an act that resolves to nothing never runs. */
export const actReach = <X extends Program>(ports: Resolving<X>, by: string, target: string, option: string) =>
  executionReach(resolve(ports, by, target, option).act);
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
  const reason = reviewed ? undefined : reviewReason(ports, value, origin, found);
  const resume = () => {
    const current = decide(ports, value, origin, capabilities, true);
    return typeof current === "function" ? current() : current;
  };
  if (reason) return () => reviewWorld(ports, value, origin, context.signal, resume, reason);
  return () => runSelected(ports, value, origin, found, context);
};
/** A mind's act waits for its review when it leaves the house, or when a rule leaves it to the supervisor. */
function reviewReason<X extends Program>(
  ports: Execution<X>,
  value: Act,
  origin: Origin,
  { tool, act }: ReturnType<typeof resolve<X>>,
): "world" | "rule" | undefined {
  if (!act || !ports.review || !parseMindActor(origin.by)) return undefined;
  if (executionReach(act) === "world") return "world";
  const action = { tool: tool?.id ?? origin.data.object, act: value.act };
  return ports.judge === true && asksJudgment(ports, origin, action, act.input, value.input) ? "rule" : undefined;
}

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
    if (ports.active?.controller.signal.aborted) throw new MechanicalRuleFailure(toolTexts.withdrawn, []);
    const current = resolve(ports, by, target, origin.data.option);
    const denied = refusal(ports, origin, current);
    if (denied || !current.act) throw new MechanicalRuleFailure(denied ?? toolTexts.unknown, []);
    enforceMechanical(ports, origin, current.tool?.id ?? target, current.act.input);
  };
  const { ports: publicPorts, credentials } = ruleCapabilities(capabilities, check);
  const context: ActContext<X> = {
    state,
    signal: runningSignal(ports, origin, offered ? undefined : tool?.id, executionReach(act)),
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
            if (!ports.active?.controller.signal.aborted) check();
            return executeNested(ports, origin, nested, execute);
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
        if (!ports.active?.controller.signal.aborted) check();
        return executeNested(ports, origin, nested, execute);
      },
      alive: () => ports.live() && ports.active?.closed !== true,
    }),
  );
  return context;
}

export function execute<X extends Program>(
  ports: Execution<X>,
  value: unknown,
  through: number,
  by: string,
  cause: readonly string[] = [],
  reaction?: Origin["data"]["reaction"],
): ExecutionResult<X> {
  if (ports.authorization?.aborted || ports.active?.closed || ports.active?.controller.signal.aborted)
    return rejected(toolTexts.withdrawn);
  if (!Value.Check(actEnvelope, value)) return rejected(toolTexts.invalid);
  const safeValue = prepareSimulationAct(value, ports.state(), ports.registry);
  if (!safeValue) return rejected(toolTexts.invalid);
  // Only a mind with a review port can have a rule's judgment asked of the supervisor; anyone else waits.
  const judging = ports.judge === true && ports.review !== undefined && parseMindActor(by) !== undefined;
  return executePublic(
    judging === !!ports.judge ? ports : { ...ports, judge: false },
    safeValue,
    through,
    by,
    cause,
    reaction,
  );
}
function executePublic<X extends Program>(
  ports: Execution<X>,
  value: Act,
  through: number,
  by: string,
  cause: readonly string[],
  reaction?: Origin["data"]["reaction"],
): ExecutionResult<X> {
  const key = JSON.stringify([value.target, value.act, value.input, value.destination]);
  if (ports.chain?.includes(key)) return rejected(toolTexts.unknown);
  const chain = [...(ports.chain ?? []), key];
  const work = (ports: Execution<X>, input: unknown, valid: boolean, capabilities: ToolCapabilities) =>
    executeScoped({ ...ports, chain }, { ...value, input }, through, by, cause, capabilities, valid, reaction);
  const schema = resolve(ports, by, value.target ?? ids.self, value.act).act?.input;
  const plain = !hasSecretInput(schema);
  if (!plain && value.destination?.kind === "device") return rejected(toolTexts.invalid);
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
    ...(value.destination ? { destination: value.destination } : {}),
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

function runSelected<X extends Program>(
  ports: Execution<X>,
  value: Act,
  origin: Origin,
  found: ReturnType<typeof resolve<X>>,
  context: ActContext<X>,
): Decision<X> | Promise<Decision<X>> {
  const { act, tool, offered } = found;
  if (!act) return rejected(toolTexts.unknown);
  const result = withPreparedInput(context, () =>
    runProgram(
      act,
      value.input,
      context,
      deviceRun(act, value.input, context, origin, tool?.id ?? origin.data.object, ports.devices, () =>
        enforceMechanical(ports, origin, tool?.id ?? origin.data.object, act.input),
      ),
    ),
  );
  const finish = (result: ActResult<X>): Decision<X> =>
    checkedDecision(ports, result, act, context, tool, offered, value.act, value.input);
  return result instanceof Promise ? result.then(finish) : finish(result);
}
