// Schemas for the house’s own acts, preferences and scenes, with their shared input and text limits.
export const toolLimits = { text: 160, label: 40, minOptions: 2, maxOptions: 4, minText: 1 } as const;

/** Bounded descriptions: one shared scene and a part for each identity. */
export const sceneLimits = { general: 4000, each: 1000, identities: 64, name: 160 } as const;
/** One bound for the JSON data of one act, whatever door it enters by: the act and its target and input. */
export const actLimits = { inputBytes: 1024 * 1024 } as const;

import { Type, type Static } from "@sinclair/typebox";
import { toolTexts } from "../texts/tools.texts.ts";
import { object, visibleText } from "../fields/visible-text.ts";

/** The schema of a nonempty house name. */
export const name = Type.String({ minLength: toolLimits.minText });
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
export const t = (max: number) => Type.String({ minLength: toolLimits.minText, maxLength: max, pattern: visibleText });
/** What its author says is happening, shared with everyone, including the parts addressed to identities. */
export const scene = object({
  general: t(sceneLimits.general),
  to: Type.Optional(
    Type.Record(
      Type.String({ pattern: `^(?=[\\s\\S]{1,${sceneLimits.name}}$)(?=[\\s\\S]*${visibleText})[\\s\\S]+$` }),
      t(sceneLimits.each),
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
