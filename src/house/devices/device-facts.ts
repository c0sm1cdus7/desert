// Define hechos del registro, conexiones y ejecuciones de dispositivos en el diario común.
import { Type } from "@sinclair/typebox";
import { object } from "../../fields/visible-text.ts";
import { deviceRegistration, deviceInventory } from "../../fields/device-protocol.ts";
const name = Type.String({ minLength: 1 });
const device = object({ device: name });
export const deviceFacts = {
  "device-registered": deviceRegistration,
  "device-accepted": device,
  "device-connected": object({ device: name, connection: name, inventory: deviceInventory }),
  "device-disconnected": object({ device: name, connection: name, reason: Type.String() }),
  "device-retired": device,
  "device-execution-started": object({
    execution: name,
    actor: name,
    program: name,
    action: name,
    journey: Type.Optional(name),
    device: name,
    connection: name,
  }),
  "device-execution-unknown": object({ execution: name, reason: Type.String() }),
  "device-execution-result": object({
    execution: name,
    status: Type.Union([Type.Literal("accepted"), Type.Literal("rejected")]),
    reference: name,
  }),
};
