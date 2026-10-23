import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { closed, name, text } from "./definition.ts";
import { ActionIconSchema } from "../interaction/toolbar.ts";

export const FactReferenceSchema = closed({ object: name, field: name });
export const ActionSelectionSchema = closed({ fact: FactReferenceSchema, value: text, label: text });
export const PublishedPresentationSchema = closed({
  view: name, title: FactReferenceSchema,
  actions: Type.Array(closed({ journey: name, icon: ActionIconSchema, selection: Type.Optional(ActionSelectionSchema) }), { uniqueItems: true }),
});
/** Derived from an owned object publication, never an independent product registry. */
export const ObjectPresentationSchema = closed({ object: name, ...PublishedPresentationSchema.properties });
export type ObjectPresentation = Frozen<Static<typeof ObjectPresentationSchema>>;
