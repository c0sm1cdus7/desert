// Declara la habilitación, delegación y adopción histórica de un asistente.
import { Type, type Static } from "@sinclair/typebox";
import { object, visibleText } from "../../fields/visible-text.ts";
import { assistantOwner } from "../../fields/mind-actor.ts";
export const mindName = Type.String({ minLength: 1, maxLength: 160, pattern: visibleText });
export const delegatedKit = Type.Array(object({ tool: mindName, acts: Type.Array(mindName, { uniqueItems: true }) }));
export type DelegatedKit = ReadonlyArray<Readonly<{ tool: string; acts: readonly string[] }>>;
export const assistantFacts = {
  "assistant-enabled": object({ owner: assistantOwner, name: mindName }),
  "assistant-disabled": object({ owner: assistantOwner }),
  "assistant-kit-set": object({ owner: assistantOwner, kit: delegatedKit }),
  "assistant-adopted": object({ owner: assistantOwner, legacy: assistantOwner }),
};
export type AssistantEnabled = Static<(typeof assistantFacts)["assistant-enabled"]>;
