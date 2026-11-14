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
// Unicode White_Space, Cc, Cf and Default_Ignorable_Code_Point, plus blank glyphs; ranges work without the u flag.
const visibleText = [
  "(?:[^\\u0000-\\u0020\\u007f-\\u00a0\\u00ad\\u034f\\u0600-\\u0605\\u061c\\u06dd\\u",
  "070f\\u0890-\\u0891\\u08e2\\u115f-\\u1160\\u1680\\u17b4-\\u17b5\\u180b-\\u180f\\u",
  "2000-\\u200f\\u2028-\\u202f\\u205f-\\u206f\\u2800\\u3000\\u3164\\ufe00-\\ufe0f\\u",
  "feff\\uffa0\\ufff0-\\ufffb\\ud800-\\udfff]|(?!(?:\\ud804[\\udcbd\\udccd]|\\ud80",
  "d[\\udc30-\\udc3f]|\\ud82f[\\udca0-\\udca3]|\\ud834[\\udd73-\\udd7a]|\\udb40[\\u",
  "dc00-\\udfff]|\\udb41[\\udc00-\\udfff]|\\udb42[\\udc00-\\udfff]|\\udb43[\\udc00",
  "-\\udfff]))[\\ud800-\\udbff][\\udc00-\\udfff])",
].join("");
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
