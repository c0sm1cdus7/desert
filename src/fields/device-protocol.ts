// Declara destinos, inventarios y mensajes de ejecución sin identidad ni capacidades de la casa.
import { Type, type Static } from "@sinclair/typebox";
import { object } from "./visible-text.ts";
const label = Type.String({ minLength: 1, maxLength: 200 });
export const executionDestination = Type.Union([
  object({ kind: Type.Literal("house") }),
  object({ kind: Type.Literal("device"), device: label }),
]);
export type ExecutionDestination = Static<typeof executionDestination>;
export const actionExecution = Type.Union([
  object({ at: Type.Literal("house") }),
  object({ at: Type.Union([Type.Literal("device"), Type.Literal("either")]), tool: label, version: label }),
]);
export type ActionExecution = Static<typeof actionExecution>;
export const deviceInstallation = object({
  tool: label,
  version: label,
  actions: Type.Array(label, { minItems: 1, uniqueItems: true }),
});
export const deviceInventory = Type.Array(deviceInstallation, { maxItems: 256 });
export type DeviceInstallation = Readonly<{ tool: string; version: string; actions: readonly string[] }>;
export const deviceRegistration = object({
  id: label,
  name: label,
  publicKey: Type.String({ minLength: 1, maxLength: 1024 }),
});
export type DeviceRegistration = Static<typeof deviceRegistration>;
export const deviceRequest = object({
  execution: label,
  actor: label,
  program: label,
  action: label,
  tool: label,
  version: label,
  device: label,
  target: label,
  journey: Type.Optional(label),
  input: Type.Unknown(),
});
export type DeviceRequest = Static<typeof deviceRequest>;
export const deviceResult = Type.Union([
  object({ status: Type.Literal("accepted"), reference: label, value: Type.Optional(Type.Unknown()) }),
  object({
    status: Type.Literal("rejected"),
    reference: label,
    reason: Type.String({ maxLength: 4000 }),
    value: Type.Optional(Type.Unknown()),
  }),
]);
export type DeviceResult = Static<typeof deviceResult>;
export type DeviceEndpoint = Readonly<{
  inventory: readonly DeviceInstallation[];
  receive(request: DeviceRequest): Promise<DeviceResult>;
}>;

export const supportsDeviceAction = (
  inventory: readonly DeviceInstallation[],
  tool: string,
  version: string,
  action: string,
): boolean => inventory.some(each => each.tool === tool && each.version === version && each.actions.includes(action));
