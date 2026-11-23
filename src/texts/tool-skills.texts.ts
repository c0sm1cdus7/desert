// Explains how to use Identities through a message reserved for the mind that works with it.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../fields/messages.ts";
export const identitySkill = defineMessage({
  id: "identities.skill",
  kind: "skill",
  parameters: Type.Object({}, { additionalProperties: false }),
  texts: {
    en:
      "Use Identities to read who is in the house, what tools each one has and each one's language. " +
      "To change tools or kits, use the offered acts and respect their refusal reasons. " +
      "Never change another identity's scene: each one describes its own.",
    es:
      "Usá Identidades para leer quién está en la casa y qué herramientas tiene. " +
      "Para cambiar herramientas o kits, usá los actos ofrecidos y respetá sus motivos de rechazo. " +
      "Nunca cambies la escena de otra identidad: cada una describe la suya.",
  },
});
