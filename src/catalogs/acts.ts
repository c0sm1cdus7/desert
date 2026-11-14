import { Type, type Static, type TProperties } from "@sinclair/typebox";
import { toolLimits, sceneLimits } from "./levers.ts";
import { toolTexts } from "../texts/tools.texts.ts";
export const object = <T extends TProperties>(fields: T) => Type.Object(fields, { additionalProperties: false });
const name = Type.String({ minLength: toolLimits.minText });
const target = object({ target: Type.String({ ...name, description: toolTexts.target }) });
/** What a person may prefer not to see: what cannot be done now, the tools that are not theirs, and the lists
 * every menu opens with while they have nothing. */
export const hideable = ["off", "foreign", "empty"] as const;
export type Hideable = (typeof hideable)[number];
/** One preference of one identity: whether it hides one of those. */
export const preference = object({
  hide: Type.Union(hideable.map(what => Type.Literal(what))),
  on: Type.Boolean(),
});
const visibleText = "[^\\s\\u200B-\\u200D\\u2060\\uFEFF]";
const sceneText = (max: number) => Type.String({ minLength: toolLimits.minText, maxLength: max, pattern: visibleText });
/** What its author says is happening, shared with everyone, including the parts addressed to identities. */
export const scene = object({
  general: sceneText(sceneLimits.general),
  to: Type.Optional(
    Type.Record(
      Type.String({ pattern: `^(?=[\\s\\S]{1,${sceneLimits.name}}$)(?=[\\s\\S]*${visibleText})[\\s\\S]+$` }),
      sceneText(sceneLimits.each),
      {
        maxProperties: sceneLimits.identities,
        additionalProperties: false,
      },
    ),
  ),
});
/** The acts every house offers each identity over itself, whatever its tools. */
export const actCatalog = {
  scene: { input: scene, purpose: toolTexts.scene },
  attend: { input: target, purpose: toolTexts.attend },
  unattend: { input: target, purpose: toolTexts.unattend },
  prefer: { input: preference, purpose: toolTexts.prefer },
};
export const actEnvelope = object({ act: name, target: Type.Optional(name), input: Type.Unknown() });
export type Act = Static<typeof actEnvelope>;
