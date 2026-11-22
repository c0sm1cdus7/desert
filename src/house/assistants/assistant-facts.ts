// Declares an assistant's enabling, delegation and historical adoption.
import { selectionKitSchema } from "../kit-selection.ts";
import { Type, type Static } from "@sinclair/typebox";
import { object, visibleText } from "../../fields/visible-text.ts";
import { assistantOwner } from "../../fields/mind-actor.ts";
export const mindName = Type.String({ minLength: 1, maxLength: 160, pattern: visibleText });
export const delegatedKit = Type.Array(object({ tool: mindName, acts: Type.Array(mindName, { uniqueItems: true }) }));
export type DelegatedKit = ReadonlyArray<Readonly<{ tool: string; acts: readonly string[] }>>;
export const assistantFacts = {
  "assistant-enabled": object({ owner: assistantOwner, name: mindName }),
  "assistant-disabled": object({ owner: assistantOwner }),
  "assistant-kit-set": Type.Union([
    object({ owner: assistantOwner, kit: delegatedKit }),
    object({ version: Type.Literal(2), owner: assistantOwner, kit: selectionKitSchema }),
  ]),
  "assistant-adopted": object({ owner: assistantOwner, legacy: assistantOwner }),
};
export type AssistantEnabled = Static<(typeof assistantFacts)["assistant-enabled"]>;
