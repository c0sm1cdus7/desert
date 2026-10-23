import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { ProductDefinitionSchema, type ObjectDefinition } from "../contracts.ts";
import { JourneySchema, type JourneyDefinition } from "../program-grammar.ts";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import type { WritableKey, ScalarKey } from "../authoring-types.ts";
import type { FactReference } from "../views/reference-helpers.ts";
import { PublishedPresentationSchema } from "../views/object-presentation.ts";
import { AuthoredPublishedPresentationSchema, validatePublishedFields, type PublishedField } from "./human-presentation.ts";
import { resolvedPublicationIssue } from "../views/publication-semantics.ts";
import { ViewSchema } from "../views/schema.ts";
import type { AuthoredView } from "./authored-types.ts";
import { authoredViewData } from "../views/authored-view.ts";
import { closed } from "../views/definition.ts";
import { declarationArray, declarationRecord } from "./declaration-data.ts";
import type { FieldRepresentation } from "../field-representation.ts";

const PublicationSchema = closed({ ...AuthoredPublishedPresentationSchema.properties, view: ViewSchema,
  actions: Type.Array(closed({ ...PublishedPresentationSchema.properties.actions.items.properties, journey: JourneySchema })) });
type Publication = Omit<Frozen<Static<typeof PublicationSchema>>, "view"> & { readonly view: AuthoredView };
type SubjectJourney<Id extends string> = Frozen<Extract<JourneyDefinition, { kind: "mutation" }>> & {
  readonly command: { readonly kind: "update"; readonly object: Id };
};
type SubjectAction<Id extends string> = Publication["actions"][number] & { readonly journey: SubjectJourney<Id> };
type PresentedField<O extends ObjectDefinition> = {
  [K in WritableKey<O>]: Omit<PublishedField, "fact" | "representation"> & {
    readonly fact: FactReference<O["id"], K>;
    readonly representation: O["facts"][K] extends { readonly kind: "asset" } ? "image"
      : O["facts"][K] extends { readonly kind: "labels" } ? "tags"
      : O["facts"][K] extends { readonly kind: "text" } ? Extract<FieldRepresentation, "text" | "paragraphs"> : "text";
  };
}[WritableKey<O>];

/** The canonical object stays independently importable by commands, without a publication cycle. */
export function publishObject<const O extends ObjectDefinition, const V extends AuthoredView,
  const A extends readonly SubjectAction<NoInfer<O>["id"]>[]>(object: O, definition: Publication & {
    readonly view: V; readonly title: FactReference<NoInfer<O>["id"], WritableKey<NoInfer<O>> & ScalarKey<NoInfer<O>>>; readonly actions: A;
    readonly fields?: readonly PresentedField<NoInfer<O>>[];
  }) {
  const authored = declarationRecord(definition);
  const actions = declarationArray(authored.actions).map(declarationRecord);
  const source = { object: jsonSnapshot(object), definition: jsonSnapshot({ ...authored,
    view: authoredViewData(definition.view), actions }) };
  if (!Check(ProductDefinitionSchema.properties.objects.items, source.object) || !Check(PublicationSchema, source.definition)) {
    throw new Error("INVALID_OBJECT_PUBLICATION");
  }
  validatePublishedFields(source.object, source.definition.fields ?? []);
  const presentation = { view: source.definition.view.id as V["id"],
    title: source.definition.title, actions: source.definition.actions.map(({ journey, ...presentation }) => ({ journey: journey.id, ...presentation })) as {
      [K in keyof A]: Omit<A[K], "journey"> & { journey: A[K]["journey"]["id"] };
    },
    ...(source.definition.fields ? { fields: source.definition.fields } : {}),
  };
  const issue = resolvedPublicationIssue(source.object, presentation, source.definition.actions.map(action => action.journey));
  if (issue) throw new Error(issue);
  return Object.freeze({ ...freezeDeep(source.object as O), presentation: Object.freeze({
    ...freezeDeep(presentation), view: definition.view,
    actions: Object.freeze(actions.map(action => Object.freeze({ ...action }))) as {
      readonly [K in keyof A]: A[K];
    },
  }) });
}
