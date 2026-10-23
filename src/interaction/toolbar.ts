import { Type, type Static, type TProperties, type TSchema } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { FaceSchema } from "./face.ts";
import { ActionIconSchema, type ActionIcon } from './action-icon.ts';
export { ActionIconSchema, type ActionIcon } from './action-icon.ts';
import { SurfaceIntentSchema, ProductSurfaceIntentSchema, CloseIntentSchema, BackIntentSchema,
  JourneyIntentSchema, AcceptIntentSchema, RecoverIntentSchema, ViewOutputIntentSchema,
  NavigationToggleIntentSchema, type SurfaceIntent } from "./intent.ts";

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
export const actionSchema = <T extends TSchema>(intent: T) => object({
  intent, label: text(), icon: ActionIconSchema,
  reason: Type.Optional(text()),
  state: Type.Union([Type.Literal("ready"), Type.Literal("unavailable"), Type.Literal("pending")]),
});
export const ToolbarActionSchema = actionSchema(SurfaceIntentSchema);
export const NavigationActionSchema = actionSchema(Type.Union([CloseIntentSchema, BackIntentSchema, NavigationToggleIntentSchema]));
export const UtilityActionSchema = actionSchema(Type.Union([JourneyIntentSchema, AcceptIntentSchema, RecoverIntentSchema, ViewOutputIntentSchema]));
export const TopToolbarSchema = object({
  title: text(), subtitle: Type.Optional(text()),
  face: Type.Optional(FaceSchema),
  leading: Type.Optional(NavigationActionSchema), trailing: Type.Optional(Type.Array(UtilityActionSchema)),
  primary: Type.Optional(UtilityActionSchema), actionGroup: Type.Optional(Type.Literal("create")),
  availability: Type.Optional(object({
    state: Type.Union([Type.Literal("ready"), Type.Literal("unknown"), Type.Literal("unavailable")]), label: text(),
  })),
});
export const BottomToolbarSchema = object({
  secondary: Type.Optional(actionSchema(ProductSurfaceIntentSchema)), primary: Type.Optional(UtilityActionSchema),
});
export type ToolbarAction = Frozen<Static<typeof ToolbarActionSchema>>;
export type TopToolbar = Frozen<Static<typeof TopToolbarSchema>>;
export type BottomToolbar = Frozen<Static<typeof BottomToolbarSchema>>;
export type Toolbar = ({ readonly edge: "top" } & TopToolbar) |
  { readonly edge: "bottom"; readonly secondary?: ToolbarAction; readonly primary?: ToolbarAction; readonly navigation?: "steps" };

export const toolbarAction = <const I extends SurfaceIntent>(intent: I, label: string, icon: ActionIcon, available = true):
  Omit<ToolbarAction, "intent"> & { readonly intent: I } => ({
  intent, label, icon, state: available ? "ready" : "unavailable",
});
