import { Type, type Static, type TProperties, type TSchema } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { FaceSchema } from "./face.ts";
import { SurfaceIntentSchema, ProductSurfaceIntentSchema, CloseIntentSchema, BackIntentSchema,
  JourneyIntentSchema, AcceptIntentSchema, RecoverIntentSchema, ViewOutputIntentSchema,
  NavigationToggleIntentSchema, type SurfaceIntent } from "./intent.ts";

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
export const ActionIconSchema = Type.Union([
  Type.Literal("back"), Type.Literal("close"), Type.Literal("save"), Type.Literal("review"),
  Type.Literal("recover"), Type.Literal("retry"), Type.Literal("create"), Type.Literal("archive"),
  Type.Literal("catalog"), Type.Literal("open"), Type.Literal("confirm"), Type.Literal("search"), Type.Literal("more"),
  Type.Literal("navigation"),
]);
export const actionSchema = <T extends TSchema>(intent: T) => object({
  intent, label: text(), icon: ActionIconSchema,
  state: Type.Union([Type.Literal("ready"), Type.Literal("unavailable"), Type.Literal("pending")]),
});
export const ToolbarActionSchema = actionSchema(SurfaceIntentSchema);
export const NavigationActionSchema = actionSchema(Type.Union([CloseIntentSchema, BackIntentSchema, NavigationToggleIntentSchema]));
export const UtilityActionSchema = actionSchema(Type.Union([JourneyIntentSchema, AcceptIntentSchema, RecoverIntentSchema, ViewOutputIntentSchema]));
export const TopToolbarSchema = object({
  title: text(), subtitle: Type.Optional(text()),
  face: Type.Optional(FaceSchema),
  leading: Type.Optional(NavigationActionSchema), trailing: Type.Optional(Type.Array(UtilityActionSchema)),
  availability: Type.Optional(object({
    state: Type.Union([Type.Literal("ready"), Type.Literal("unknown"), Type.Literal("unavailable")]), label: text(),
  })),
});
export const BottomToolbarSchema = object({
  secondary: Type.Optional(actionSchema(ProductSurfaceIntentSchema)), primary: Type.Optional(UtilityActionSchema),
});
export type ActionIcon = Static<typeof ActionIconSchema>;
export type ToolbarAction = Frozen<Static<typeof ToolbarActionSchema>>;
export type TopToolbar = Frozen<Static<typeof TopToolbarSchema>>;
export type BottomToolbar = Frozen<Static<typeof BottomToolbarSchema>>;
export type Toolbar = ({ readonly edge: "top" } & TopToolbar) |
  { readonly edge: "bottom"; readonly secondary?: ToolbarAction; readonly primary?: ToolbarAction };

export const toolbarAction = <const I extends SurfaceIntent>(intent: I, label: string, icon: ActionIcon, available = true):
  Omit<ToolbarAction, "intent"> & { readonly intent: I } => ({
  intent, label, icon, state: available ? "ready" : "unavailable",
});
