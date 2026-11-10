import { Type, type Static, type TProperties } from "@sinclair/typebox";
import { toolLimits } from "./levers.ts";
export const object = <T extends TProperties>(fields: T) => Type.Object(fields, { additionalProperties: false });
const name = Type.String({ minLength: toolLimits.minText });
export const actEnvelope = object({ act: name, target: Type.Optional(name), input: Type.Unknown() });
export type Act = Static<typeof actEnvelope>;
