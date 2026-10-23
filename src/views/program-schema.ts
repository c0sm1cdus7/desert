import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { ActionIconSchema } from "../interaction/toolbar.ts";
import { ViewSchema, ViewLimits } from "./schema.ts";
import { closed, immutable, name, text } from "./definition.ts";
import { ObjectPresentationSchema, FactReferenceSchema } from "./object-presentation.ts";
import { ActivityPlanSchema } from "../activities/schema.ts";

export const ViewProgramVersion = "desert.view-program/4" as const;
export const ViewOutputActionSchema = immutable(Type.Union([
  closed({ kind: Type.Literal("journey"), journey: name }),
  closed({ kind: Type.Literal("select") }),
  closed({ kind: Type.Literal("submit") }),
  closed({ kind: Type.Literal("close") }),
  closed({ kind: Type.Literal("back") }),
  closed({ kind: Type.Literal("lock") }),
]));
export const ViewOutputBindingSchema = closed({ view: name, output: name, action: ViewOutputActionSchema });
const outputs = Type.Array(ViewOutputBindingSchema, { maxItems: ViewLimits.catalogSize });
export const ViewJourneyVariants = Object.freeze({
  presentation: closed({ id: name, kind: Type.Literal("presentation"), view: name,
    collections: Type.Optional(Type.Array(closed({ input: name, read: name, limit: Type.Integer({ minimum: 1, maximum: 200 }),
      summary: Type.Optional(closed({ field: FactReferenceSchema,
        segments: Type.Array(closed({ value:text,label:text }), {minItems:2,maxItems:6}) })),
      preview: Type.Optional(closed({ read: name, where: FactReferenceSchema, media: FactReferenceSchema,
        cover: Type.Optional(FactReferenceSchema) })),
      where: Type.Optional(closed({ field: name, value: text })) }), { maxItems: 8 })), outputs }),
  read: closed({ id: name, kind: Type.Literal("read"), view: name, detailView: name,
    presentation: Type.Optional(Type.Literal("main")),
    referenceCreation: Type.Optional(Type.Literal("separate")),
    related: Type.Optional(Type.Array(closed({ input: name, read: name,
      layout: Type.Optional(FactReferenceSchema),
      membership: Type.Optional(closed({ update: name, input: name })),
      where: closed({ field: FactReferenceSchema, includes: Type.Literal("subject") }) }), { maxItems: 8 })), outputs }),
  create: closed({ id: name, kind: Type.Literal("create"), source: name, view: name, preferredDock: Type.Literal("right"),
    initializeFrom: Type.Optional(closed({ input: name, source: name })),
    presentation: Type.Optional(Type.Literal("transient")),
    startWith: Type.Optional(closed({ kind: Type.Literal("file-picker"), input: name })), outputs }),
  update: closed({ id: name, kind: Type.Literal("update"), source: name, view: name, preferredDock: Type.Literal("right"),
    presentation: Type.Optional(Type.Literal("transient")),
    initialize: Type.Array(closed({ input: name, fact: name }), { maxItems: ViewLimits.catalogSize }), outputs }),
  action: closed({ id: name, kind: Type.Literal("action"), source: name, outputs: Type.Tuple([]) }),
  activity: closed({ id: name, kind: Type.Literal("activity"), source: name, activity: ActivityPlanSchema,
    preferredDock: Type.Literal("right"), outputs: Type.Tuple([]) }),
});
export const ViewJourneySchema = immutable(Type.Union([
  ViewJourneyVariants.presentation, ViewJourneyVariants.read, ViewJourneyVariants.create,
  ViewJourneyVariants.update, ViewJourneyVariants.action, ViewJourneyVariants.activity,
]));
export const ViewDestinationSchema = closed({ id: name, label: text, icon: ActionIconSchema, entryJourney: name });
/** Product navigation owns selection, order and semantic grouping; icons are not routing rules. */
export const ViewNavigationEntrySchema = immutable(closed({
  destination: name, group: text, purpose: Type.Union([Type.Literal("content"), Type.Literal("utility")]),
}));
export const ViewProgramSchema = closed({
  version: Type.Literal(ViewProgramVersion), productId: name, label: text, workspace: name,
  objects: Type.Optional(Type.Array(ObjectPresentationSchema, { maxItems: ViewLimits.catalogSize })),
  views: Type.Array(ViewSchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
  journeys: Type.Array(ViewJourneySchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
  destinations: Type.Array(ViewDestinationSchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
  entry: name, navigation: Type.Array(ViewNavigationEntrySchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
});
export type ViewProgram = Frozen<Static<typeof ViewProgramSchema>>;
export type ViewJourney = Frozen<Static<typeof ViewJourneySchema>>;
export type ViewDestination = Frozen<Static<typeof ViewDestinationSchema>>;
export type ViewNavigationEntry = Frozen<Static<typeof ViewNavigationEntrySchema>>;
export type ViewOutputBinding = Frozen<Static<typeof ViewOutputBindingSchema>>;
export type ViewOutputAction = Frozen<Static<typeof ViewOutputActionSchema>>;
