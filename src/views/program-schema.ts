import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { ActionIconSchema } from "../interaction/toolbar.ts";
import { ViewSchema, ViewLimits } from "./schema.ts";
import { closed, immutable, name, text } from "./definition.ts";

export const ViewProgramVersion = "desert.view-program/1" as const;
export const ViewOutputActionSchema = immutable(Type.Union([
  closed({ kind: Type.Literal("journey"), journey: name }),
  closed({ kind: Type.Literal("select") }),
  closed({ kind: Type.Literal("submit") }),
  closed({ kind: Type.Literal("close") }),
]));
export const ViewOutputBindingSchema = closed({ view: name, output: name, action: ViewOutputActionSchema });
const outputs = Type.Array(ViewOutputBindingSchema, { maxItems: ViewLimits.catalogSize });
export const ViewJourneySchema = immutable(Type.Union([
  closed({ id: name, kind: Type.Literal("presentation"), view: name, outputs }),
  closed({ id: name, kind: Type.Literal("read"), view: name, detailView: name, outputs }),
  closed({ id: name, kind: Type.Literal("create"), view: name, preferredDock: Type.Literal("right"), outputs }),
]));
export const ViewDestinationSchema = closed({ id: name, label: text, icon: ActionIconSchema, entryJourney: name });
export const ViewProgramSchema = closed({
  version: Type.Literal(ViewProgramVersion), productId: name, label: text,
  views: Type.Array(ViewSchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
  journeys: Type.Array(ViewJourneySchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
  destinations: Type.Array(ViewDestinationSchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
  entry: name, navigation: Type.Array(name, { minItems: 1, maxItems: ViewLimits.catalogSize }),
});
export type ViewProgram = Frozen<Static<typeof ViewProgramSchema>>;
export type ViewJourney = Frozen<Static<typeof ViewJourneySchema>>;
export type ViewDestination = Frozen<Static<typeof ViewDestinationSchema>>;
export type ViewOutputBinding = Frozen<Static<typeof ViewOutputBindingSchema>>;
export type ViewOutputAction = Frozen<Static<typeof ViewOutputActionSchema>>;
