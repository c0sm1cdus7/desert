// Explica cómo usar Identidades mediante un mensaje reservado a la mente que trabaja con ella.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../fields/messages.ts";
export const identitySkill = defineMessage({
  id: "identities.skill",
  kind: "skill",
  parameters: Type.Object({}, { additionalProperties: false }),
  texts: {
    es:
      "Usá Identidades para leer quién está en la casa y qué herramientas tiene. " +
      "Para cambiar herramientas o kits, usá los actos ofrecidos y respetá sus motivos de rechazo. " +
      "Nunca cambies la escena de otra identidad: cada una describe la suya.",
  },
});
