// Shows an assistant's authorship with its holder and keeps the names of historical actors.
import type { Language } from "../fields/languages.ts";
import { parseMindActor } from "../fields/mind-actor.ts";
import { requireMind } from "../fields/mind-errors.ts";
import { assistantAuthor } from "../texts/assistant.texts.ts";
import { identityDisplayName, type House } from "./members.ts";
export function actorDisplayName(house: House, actor: string, language: Language): string {
  requireMind(house, "house");
  requireMind(language, "language");
  const parsed = parseMindActor(actor);
  const assistant = parsed?.kind === "assistant" ? house.assistants.get(parsed.owner) : undefined;
  return assistant
    ? assistantAuthor.text(language, { name: assistant.name, owner: identityDisplayName(house, assistant.owner) })
    : identityDisplayName(house, actor);
}
