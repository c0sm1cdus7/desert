import { Type, type Static, type TProperties } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { TopToolbarSchema, BottomToolbarSchema, ToolbarActionSchema, NavigationActionSchema,
  UtilityActionSchema, actionSchema } from "./toolbar.ts";
import { InformationSchema } from "./information-content.ts";
import { CloseIntentSchema, RecoverIntentSchema, intentKey, submitsJourney } from "./intent.ts";
export { ToolbarActionSchema, type ToolbarAction } from "./toolbar.ts";

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
export const DestinationSchema = object({ destination: text(), label: text(), available: Type.Boolean() });
export const FactsSchema = object({
  kind: Type.Literal("facts"), object: text(), fields: Type.Array(text()),
  facts: Type.Record(Type.String(), Type.Union([Type.String(), Type.Number()])),
  labels: Type.Record(Type.String(), Type.String()),
  multiline: Type.Optional(Type.Array(text(), { uniqueItems: true })),
});
export const FormSchema = object({
  kind: Type.Literal("form"), submit: text(),
  fields: Type.Array(object({ name: text(), label: text(), value: Type.String(), required: Type.Boolean(),
    error: Type.Optional(text()), maxLength: Type.Optional(Type.Integer({ minimum: 0 })),
    primitive: Type.Union([Type.Literal("input.text"), Type.Literal("input.multiline")]),
  })),
});
export const ContextSchema = object({ kind: Type.Literal("context"), details: FactsSchema, actions: Type.Array(DestinationSchema) });
export const ReviewSchema = object({ kind: Type.Literal("review"), details: FactsSchema, recovery: Type.Optional(text()) });
const MessageSchema = object({ kind: Type.Literal("message"), text: text() });
export const UtilitiesContentSchema = object({ kind: Type.Literal("utilities"), actions: Type.Array(UtilityActionSchema, { minItems: 1 }) });
const GeneralContentSchema = Type.Union([FactsSchema, FormSchema, ContextSchema, ReviewSchema, MessageSchema, InformationSchema]);
export const FrameContentSchema = Type.Union([GeneralContentSchema, UtilitiesContentSchema]);
export const SurfaceFrameVersion = "desert.surface-frame/6" as const;
const common = { version: Type.Literal(SurfaceFrameVersion), top: TopToolbarSchema };
const DismissActionSchema = actionSchema(CloseIntentSchema);
const MessageTopSchema = object({ ...TopToolbarSchema.properties, trailing: Type.Optional(Type.Array(Type.Never())) });
const ContextTopSchema = object({ ...TopToolbarSchema.properties,
  trailing: Type.Optional(Type.Array(actionSchema(RecoverIntentSchema))),
});
const DismissBottomSchema = object({ secondary: Type.Optional(DismissActionSchema), primary: Type.Optional(Type.Never()) });
export const SurfaceFrameSchema = Type.Union([
  object({ ...common, kind: Type.Literal("context"), top: ContextTopSchema,
    content: Type.Union([FactsSchema, ContextSchema, MessageSchema]),
    bottom: object({ secondary: Type.Optional(NavigationActionSchema), primary: Type.Optional(Type.Never()) }),
  }),
  object({ ...common, kind: Type.Literal("message"), top: MessageTopSchema, content: MessageSchema, bottom: DismissBottomSchema }),
  object({ ...common, kind: Type.Literal("utilities"), top: MessageTopSchema, content: UtilitiesContentSchema, bottom: DismissBottomSchema }),
  object({ ...common, kind: Type.Literal("journey"), content: GeneralContentSchema, bottom: BottomToolbarSchema }),
  object({ ...common, kind: Type.Literal("specimen"), content: GeneralContentSchema, bottom: BottomToolbarSchema }),
]);

export type SurfaceFrame = Frozen<Static<typeof SurfaceFrameSchema>>;
export type FrameContent = SurfaceFrame["content"];
export type Destination = Frozen<Static<typeof DestinationSchema>>;
export type FactsContent = Frozen<Static<typeof FactsSchema>>;

/** Shared semantic checks for both frame bodies and the canonical bank nodes. */
export function checkFrameContent(content: FrameContent): void {
  const details = content.kind === "facts" ? content :
    content.kind === "context" || content.kind === "review" ? content.details : undefined;
  if (details && (new Set(details.fields).size !== details.fields.length ||
    details.multiline?.some(field => !details.fields.includes(field)))) throw new Error("INVALID_SURFACE_FRAME_FIELDS");
  if (details && details.fields.some(field => !Object.hasOwn(details.labels, `${details.object}.${field}`) ||
    !details.labels[`${details.object}.${field}`]?.trim())) throw new Error("INVALID_SURFACE_FRAME_LABELS");
  if (content.kind === "form" && new Set(content.fields.map(field => field.name)).size !== content.fields.length) {
    throw new Error("INVALID_SURFACE_FRAME_FIELDS");
  }
  if (content.kind === "utilities" && new Set(content.actions.map(action => intentKey(action.intent))).size !== content.actions.length) {
    throw new Error("INVALID_SURFACE_FRAME_ACTIONS");
  }
}

export function surfaceFrame(value: unknown): SurfaceFrame {
  const snapshot = jsonSnapshot(value);
  if (!Check(SurfaceFrameSchema, snapshot)) throw new Error("INVALID_SURFACE_FRAME");
  checkFrameContent(snapshot.content);
  const actions = [snapshot.bottom.secondary, snapshot.bottom.primary].filter(action => action !== undefined);
  const ids = actions.map(action => intentKey(action.intent));
  const topIds = [snapshot.top.leading, ...(snapshot.top.trailing ?? [])]
    .filter(action => action !== undefined).map(action => intentKey(action.intent));
  if (new Set(ids).size !== ids.length || new Set(topIds).size !== topIds.length ||
    (snapshot.content.kind === "form" && !submitsJourney(snapshot.bottom.primary?.intent, snapshot.content.submit))) {
    throw new Error("INVALID_SURFACE_FRAME_ACTIONS");
  }
  return freezeDeep(snapshot);
}
