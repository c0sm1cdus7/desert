// Gathers messages about assistants' administration, delegation, adoption and visible authorship.
import { Type } from "@sinclair/typebox";
import { defineMessage } from "../fields/messages.ts";
import type { Language } from "../fields/languages.ts";
import { object } from "../fields/visible-text.ts";
const texts = {
  enable: "habilitar asistente",
  disable: "deshabilitar asistente",
  delegate: "delegar al asistente",
  adopt: "adoptar asistente",
  enablePurpose: "habilitación del asistente de la identidad",
  disablePurpose: "retiro del asistente y su delegación",
  delegatePurpose: "actos propios delegados al asistente",
  adoptPurpose: "adopción de identidad anterior",
  enableEnter: "habilitar",
  disableEnter: "deshabilitar",
  delegateEnter: "delegar",
  adoptEnter: "adoptar",
  name: "Nombre del asistente",
  nameHint: "Nombre visible",
  legacy: "Identidad anterior",
  legacyHint: "Identificador anterior",
  tool: "Herramienta",
  toolHint: "Identificador de la herramienta",
  acts: "Actos",
  kit: "Delegación",
  more: "Herramientas",
  done: "terminar",
  another: "otra herramienta",
  owner: "solo el titular del asistente",
  absent: "el titular no está en la casa",
  disabled: "asistente sin habilitar",
  conflict: "el asistente tiene otro nombre",
  unknown: "herramienta o acto inexistente",
  repeated: "herramienta repetida",
  permission: "el titular no tiene ese acto",
  reserved: "Identidades no se delega",
  legacyInvalid: "identidad anterior no disponible",
  collision: "identidad anterior ya adoptada",
  incompatible: "asistente con otra identidad anterior",
  enabled: "Habilitado · Asistente",
  disabledDone: "Deshabilitado · Asistente",
  delegated: "Delegado · Kit del asistente",
  adopted: "Adoptada · Identidad anterior como asistente",
  adoptedPending: "Adoptada · Identidad anterior como asistente · falta delegación del titular",
  unchanged: "Conservado · Asistente sin cambios",
  adoptedAlready: "Conservada · Adopción ya realizada",
  confirmAdopt: "Adoptar · La identidad anterior sale de la casa · lo escrito conserva su autoría",
  caseEnabled: "habilita el asistente sin delegar",
  caseDisabled: "deshabilita y retira la delegación",
  caseDelegate: "solo el titular delega sus actos",
  caseAdopt: "adopta sin reescribir autorías",
  caseRepeat: "repetir conserva el estado",
  caseOwner: "rechaza a otro titular",
  caseAbsent: "rechaza un titular retirado",
  caseMissing: "rechaza un asistente sin habilitar",
  caseConflict: "rechaza otro nombre",
  caseLegacy: "rechaza una identidad anterior ajena",
  casePermission: "rechaza un acto sin permiso",
  caseUnknown: "rechaza un acto inexistente",
  caseDuplicate: "rechaza herramientas repetidas",
  caseReserved: "rechaza delegar Identidades",
  caseCollision: "rechaza una adopción incompatible",
  caseAdmin: "solo administra quien tiene autoridad",
} as const;
export type AssistantTextKey = keyof typeof texts;
const interfaceMessage = defineMessage({
  id: "assistant.interface",
  kind: "text",
  parameters: object({ key: Type.Union(Object.keys(texts).map(key => Type.Literal(key))) }),
  texts: {
    es: ({ key }) => {
      const found = Object.entries(texts).find(([id]) => id === key);
      if (!found) throw new Error(`Falta el texto del asistente · ${key}`);
      return found[1];
    },
  },
});
export const assistantText = (key: AssistantTextKey, language: Language): string =>
  interfaceMessage.text(language, { key });
export const assistantAuthor = defineMessage({
  id: "assistant.author",
  kind: "text",
  parameters: object({ name: Type.String(), owner: Type.String() }),
  texts: { es: ({ name, owner }) => `${name}, por ${owner}` },
});
