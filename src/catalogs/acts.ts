import { Type, type Static, type TProperties } from "@sinclair/typebox";
import { toolLimits } from "./levers.ts";
import { toolTexts } from "../texts/tools.texts.ts";
export const object = <T extends TProperties>(fields: T) => Type.Object(fields, { additionalProperties: false });
const name = Type.String({ minLength: toolLimits.minText });
const target = object({ target: Type.String({ ...name, description: toolTexts.target }) });
/** What a person may prefer not to see: what cannot be done now, and the tools that are not theirs. */
export const hideable = ["off", "foreign"] as const;
export type Hideable = (typeof hideable)[number];
/** One preference of one identity: whether it hides one of those. */
export const preference = object({
  hide: Type.Union(hideable.map(what => Type.Literal(what))),
  on: Type.Boolean(),
});
/** The acts every house offers each identity over itself, whatever its tools. */
export const actCatalog = {
  attend: { input: target, purpose: toolTexts.attend },
  unattend: { input: target, purpose: toolTexts.unattend },
  prefer: { input: preference, purpose: toolTexts.prefer },
};
export const actEnvelope = object({ act: name, target: Type.Optional(name), input: Type.Unknown() });
export type Act = Static<typeof actEnvelope>;
