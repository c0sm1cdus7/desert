// Define mensajes con parámetros tipados y exige el idioma en cada lectura.
import type { Static, TObject } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { languages, type Language } from "./languages.ts";
const messageDefinition = Symbol();
export type MessageKind = "text" | "skill" | "house" | "mind";
export type Message<P, K extends MessageKind = MessageKind> = Readonly<{
  id: string;
  kind: K;
  [messageDefinition]: true;
  text: (language: Language, parameters: P) => string;
}>;
export type Skill = Message<Record<string, never>, "skill">;
type Definition<S extends TObject, K extends MessageKind> = Readonly<{
  id: string;
  kind: K;
  parameters: S;
  texts: Readonly<Record<Language, string | ((parameters: Static<S>) => string)>>;
}>;
const required = (value: unknown, name: string): void => {
  if (value === undefined) throw new Error(`Falta el argumento · ${name}`);
};
function renderMessage<S extends TObject>(
  definition: Definition<S, MessageKind>,
  language: unknown,
  values: unknown,
): string {
  const { id, parameters, texts } = definition;
  if (language === undefined) throw new Error(`Idioma ausente · ${id}`);
  if (typeof language !== "string") throw new Error(`Idioma inválido · ${id}`);
  const chosen = languages.find(known => known === language);
  if (chosen === undefined) throw new Error(`Idioma no declarado · ${id} · ${language}`);
  if (values === undefined) throw new Error(`Parámetros ausentes · ${id}`);
  if (!Value.Check(parameters, values)) {
    const error = Value.Errors(parameters, values).First();
    throw new Error(`Parámetros inválidos · ${id} · ${error?.path}`);
  }
  const translation = texts[chosen];
  if (typeof translation !== "string" && typeof translation !== "function")
    throw new Error(`Falta traducción · ${id} · ${chosen}`);
  const text = typeof translation === "string" ? translation : translation(values);
  if (!text.trim()) throw new Error(`Traducción vacía · ${id} · ${chosen}`);
  return text;
}
/** The schema checks untyped callers too; each translation receives the same parameter type. */
export function defineMessage<S extends TObject, const K extends MessageKind>(
  definition: Definition<S, K>,
): Message<Static<S>, K> {
  required(definition, "definition");
  const { id, kind, parameters, texts } = definition;
  for (const [name, value] of Object.entries({ id, kind, parameters, texts })) required(value, name);
  if (!id.trim()) throw new Error("Falta el id del mensaje");
  for (const language of languages) {
    const text = texts[language];
    if (!Object.hasOwn(texts, language) || (typeof text !== "string" && typeof text !== "function"))
      throw new Error(`Falta traducción · ${id} · ${language}`);
    if (typeof text === "string" && !text.trim()) throw new Error(`Traducción vacía · ${id} · ${language}`);
  }
  return Object.freeze({
    id,
    kind,
    [messageDefinition]: true as const,
    text: (language, values) => renderMessage(definition, language, values),
  });
}
