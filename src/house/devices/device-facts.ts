// Defines the journal facts of device registration, connections, executions and their notices.
import { Type } from "@sinclair/typebox";
import { object } from "../../fields/visible-text.ts";
import { deviceRegistration, deviceInventory, noticeStatus } from "../../fields/device-protocol.ts";
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
    /** Since 21/11: the action declared that its device announces; older journals read it as not announcing. */
    announces: Type.Optional(Type.Literal(true)),
  }),
  "device-execution-unknown": object({ execution: name, reason: Type.String() }),
  "device-execution-result": object({
    execution: name,
    status: Type.Union([Type.Literal("accepted"), Type.Literal("rejected")]),
    reference: name,
  }),
  /** The device's authenticated word about an announcing execution; it never rewrites the execution's result. */
  "device-execution-notice": object({ execution: name, status: noticeStatus, reference: name }),
};
