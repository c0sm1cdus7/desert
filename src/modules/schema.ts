import { Type } from "@sinclair/typebox";
import { ProductDefinitionSchema } from "../contracts.ts";
import { JourneySchema } from "../program-grammar.ts";
import { ViewSchema } from "../views/schema.ts";
import { ViewJourneyVariants, ViewDestinationSchema, ViewNavigationEntrySchema, ViewOutputActionSchema } from "../views/program-schema.ts";
import { closed, name, text } from "../views/definition.ts";
import { AuthoredPublishedPresentationSchema, HumanReviewSchema } from "./human-presentation.ts";
import { AuthoredExposureSchema } from "../human-exposure.ts";
import { declaredSchema } from "../views/declared.ts";

const reference = <K extends "view" | "journey" | "destination">(kind: K) => Type.Union([
  name, closed({ kind: Type.Literal(kind), owner: name, id: name }),
]);
const output = closed({ view: reference("view"), output: name, action: Type.Union([
  closed({ kind: Type.Literal("journey"), journey: reference("journey") }),
  ...ViewOutputActionSchema.anyOf.filter(action => action.properties.kind.const !== "journey"),
]) });
const sharedJourney = { view: reference("view"), outputs: Type.Array(output) };
export const AuthoredViewJourneySchema = Type.Union([
  closed({ ...ViewJourneyVariants.presentation.properties, ...sharedJourney }),
  closed({ ...ViewJourneyVariants.read.properties, ...sharedJourney, detailView: reference("view") }),
  closed({ ...ViewJourneyVariants.create.properties, ...sharedJourney, source: reference("journey") }),
  closed({ ...ViewJourneyVariants.update.properties, ...sharedJourney, source: reference("journey") }),
  closed({ ...ViewJourneyVariants.action.properties, source: reference("journey") }),
  closed({ ...ViewJourneyVariants.activity.properties, source: reference("journey") }),
]);
export const ModuleJourneySchema = Type.Union([
  closed({ execution: JourneySchema.anyOf[0], presentation: Type.Optional(AuthoredViewJourneySchema),
    label: Type.Optional(text), humanReview: Type.Optional(HumanReviewSchema) }),
  closed({ execution: JourneySchema.anyOf[1], presentation: Type.Optional(AuthoredViewJourneySchema),
    label: Type.Optional(text), humanReview: Type.Optional(Type.Never()) }),
  closed({ execution: Type.Optional(Type.Never()), presentation: AuthoredViewJourneySchema,
    label: Type.Optional(Type.Never()), humanReview: Type.Optional(Type.Never()) }),
]);
export const AuthoredViewDestinationSchema = closed({ ...ViewDestinationSchema.properties, entryJourney: reference("journey") });
export const AuthoredViewNavigationEntrySchema = closed({ ...ViewNavigationEntrySchema.properties, destination: reference("destination") });
const domain = ProductDefinitionSchema.properties;
export const PublishedObjectSchema = closed({ ...domain.objects.items.properties,
  presentation: Type.Optional(AuthoredPublishedPresentationSchema) });
export const OwnedProperties = {
  objects: Type.Optional(Type.Array(PublishedObjectSchema)),
  dependencies: domain.dependencies, policies: domain.policies,
  journeys: Type.Optional(Type.Array(ModuleJourneySchema)),
  views: Type.Optional(Type.Array(ViewSchema)), destinations: Type.Optional(Type.Array(AuthoredViewDestinationSchema)),
};
export const OwnedDefinitionsSchema = closed(OwnedProperties);
const names = Type.Optional(Type.Array(name, { uniqueItems: true }));
export const ModuleExportsSchema = closed({
  objects: names, dependencies: names, journeys: names, views: names, destinations: names,
});
export const ModuleDefinitionSchema = closed({ id: name, ...OwnedProperties, exports: Type.Optional(ModuleExportsSchema) });
/** What a module and a product declare (plan §14): the same shapes with a message in each message field. The product's
 * catalog resolves them into the compiled shapes above when the product is composed. */
export const DeclaredModuleDefinitionSchema = declaredSchema(ModuleDefinitionSchema);
export const ProductCompositionSchema = closed({
  id: name, label: text, workspace: reference("view"), ...OwnedProperties,
  modules: Type.Array(ModuleDefinitionSchema), exposures: Type.Array(AuthoredExposureSchema, { minItems: 1 }),
  entry: reference("destination"), navigation: Type.Array(AuthoredViewNavigationEntrySchema, { minItems: 1 }),
});
export const DeclaredProductCompositionSchema = declaredSchema(ProductCompositionSchema);
