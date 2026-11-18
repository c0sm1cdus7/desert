// Selecciona el lugar declarado y despacha por el puerto del core después de los controles comunes.
import { Value } from "@sinclair/typebox/value";
import { fine } from "../../fields/fields.ts";
import type { ActionExecution, DeviceRequest, ExecutionDestination } from "../../fields/device-protocol.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
import type { HouseEvent } from "../../house/facts.ts";
import type { ActContext, ActResult, Program, ToolAct } from "../tool-contract.ts";
import { hasSecretInput } from "../inputs/secret-input.ts";
export type DeviceDispatch = <X extends Program>(request: DeviceRequest, signal?: AbortSignal) => Promise<ActResult<X>>;
export function destinationProblem(
  declaration: ActionExecution | undefined,
  destination: ExecutionDestination | undefined,
): string | undefined {
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
): (() => Promise<ActResult<X>>) | undefined {
  const destination = origin.data.destination;
  if (destination?.kind !== "device") return undefined;
  const execution = act.execution;
  return async () => {
    if (!execution || execution.at === "house" || !dispatch)
      return { status: "rejected", reason: deviceTexts.unavailable };
    // Entregar secretos corresponde al sobre cifrado; este puerto sólo lleva entradas públicas declaradas.
    if (hasSecretInput(act.input) || !Value.Check(act.input, input) || !fine(act.input, input))
      return { status: "rejected", reason: deviceTexts.invalid };
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
    );
  };
}

/** Ejecutar en un dispositivo cruza el límite de la casa, cualquiera sea el alcance declarado. */
export const executionReach = (act: { reach: "house" | "world"; execution?: ActionExecution } | undefined) =>
  act?.execution && act.execution.at !== "house" ? "world" : (act?.reach ?? "house");
