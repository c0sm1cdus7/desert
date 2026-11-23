// Picks the declared place and dispatches through the core's port after the common checks.
import { type Text } from "../../fields/phrases.ts";
import { Value } from "@sinclair/typebox/value";
import { fine } from "../../fields/fields.ts";
import type { ActionExecution, DeviceRequest, ExecutionDestination } from "../../fields/device-protocol.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
import type { HouseEvent } from "../../house/facts.ts";
import type { ActContext, ActResult, Program, ToolAct } from "../tool-contract.ts";
import { hasSecretInput } from "../inputs/secret-input.ts";
/** `announces` travels apart from the request: it is the house's record, never something the device is told. */
export type DeviceDispatch = <X extends Program>(
  request: DeviceRequest,
  signal?: AbortSignal,
  beforeSend?: () => void,
  announces?: boolean,
) => Promise<ActResult<X>>;
export function destinationProblem(
  declaration: ActionExecution | undefined,
  destination: ExecutionDestination | undefined,
): Text | undefined {
  const at = declaration?.at ?? "house";
  if (!destination) return at === "house" ? undefined : deviceTexts.destination;
  return (destination.kind === "house" && at === "device") || (destination.kind === "device" && at === "house")
    ? deviceTexts.destination
    : undefined;
}
export function deviceRun<X extends Program>(
  act: ToolAct<X>,
  input: unknown,
  context: ActContext<X>,
  origin: HouseEvent<"act">,
  program: string,
  dispatch: DeviceDispatch | undefined,
  check: () => void,
): (() => Promise<ActResult<X>>) | undefined {
  const destination = origin.data.destination;
  if (destination?.kind !== "device") return undefined;
  const execution = act.execution;
  return async () => {
    if (!execution || execution.at === "house" || !dispatch)
      return { status: "rejected", reason: deviceTexts.unavailable };
    // Handing secrets over belongs to the sealed envelope; this port carries only declared public input.
    if (hasSecretInput(act.input) || !Value.Check(act.input, input) || !fine(act.input, input))
      return { status: "rejected", reason: deviceTexts.invalid };
    check();
    return dispatch(
      {
        execution: origin.id,
        actor: origin.by,
        program,
        action: origin.data.option,
        tool: execution.tool,
        version: execution.version,
        device: destination.device,
        target: context.target,
        ...(origin.process ? { journey: origin.process } : {}),
        input,
      },
      context.signal,
      check,
      execution.announces === true,
    );
  };
}

/** Running on a device crosses the house's boundary, whatever reach the action declares. */
export const executionReach = (act: { reach: "house" | "world"; execution?: ActionExecution } | undefined) =>
  act?.execution && act.execution.at !== "house" ? "world" : (act?.reach ?? "house");
