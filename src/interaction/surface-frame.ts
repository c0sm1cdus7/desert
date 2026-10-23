import { Type, type Static, type TProperties } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { TopToolbarSchema, BottomToolbarSchema, ToolbarActionSchema, NavigationActionSchema,
  UtilityActionSchema, actionSchema } from "./toolbar.ts";
import { InformationSchema } from "./information-content.ts";
import { FactValueSchema } from "../fact-values.ts";
import { FileMetadataSchema } from "./control-nodes.ts";
import { LabelControlLimitsSchema, ReferenceStateSchema, ReferenceChoiceSchema,MediaReferenceStateSchema } from "./labels-control.ts";
import { CloseIntentSchema, RecoverIntentSchema, JourneyIntentSchema, intentKey, submitsJourney } from "./intent.ts";
import {AttentionSignalSchema} from '../attention.ts';
export { ToolbarActionSchema, type ToolbarAction } from "./toolbar.ts";

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
export const DestinationSchema = object({ destination: text(), label: text(), available: Type.Boolean() });
export const FactsSchema = object({
  kind: Type.Literal("facts"), object: text(), fields: Type.Array(text()),
  facts: Type.Record(Type.String(), FactValueSchema),
  labels: Type.Record(Type.String(), Type.String()),
  multiline: Type.Optional(Type.Array(text(), { uniqueItems: true })),
  images: Type.Optional(Type.Array(text(), { uniqueItems: true })),
  tags: Type.Optional(Type.Array(text(), { uniqueItems: true })),
  references:Type.Optional(Type.Record(Type.String(),Type.Array(ReferenceChoiceSchema))),
});
export const TextFormFieldSchema = object({ name: text(), label: text(), value: Type.String(), required: Type.Boolean(),
    disabled: Type.Optional(Type.Boolean()),
    error: Type.Optional(text()), maxLength: Type.Optional(Type.Integer({ minimum: 0 })),
    primitive: Type.Union([Type.Literal("input.text"), Type.Literal("input.multiline")]),
});
export const FormSchema = object({
  kind: Type.Literal("form"), submit: text(),
  fields: Type.Array(Type.Union([TextFormFieldSchema, object({ name: text(), label: text(), required: Type.Boolean(),
    disabled: Type.Optional(Type.Boolean()),
    primitive: Type.Literal("control.files"), files: Type.Array(FileMetadataSchema, { maxItems: 1 }), error: Type.Optional(text()),
    media:Type.Optional(Type.Union([Type.Literal("image"),Type.Literal("media")])),
  }), object({ name: text(), label: text(), required: Type.Boolean(), primitive: Type.Literal("control.labels"),
    disabled: Type.Optional(Type.Boolean()),
    values: Type.Array(Type.String()), limits: LabelControlLimitsSchema, error: Type.Optional(text()),
    reference:Type.Optional(ReferenceStateSchema),
    mediaReference:Type.Optional(MediaReferenceStateSchema),
  }), object({ name: text(), label: text(), required: Type.Literal(false), primitive: Type.Literal("control.select"),
    disabled: Type.Optional(Type.Boolean()),
    value: text(), options: Type.Array(object({ value: text(), label: text(), disabled: Type.Boolean() }), { minItems: 1 }),
    error: Type.Optional(text()),
  })])),
});
export const ObjectSelectorSchema = object({ field: text(), label: text(), value: Type.Union([text(), Type.Null()]), disabled: Type.Boolean(),
  options: Type.Array(object({ value: text(), label: text(), journey: text(), available: Type.Boolean() }), { minItems: 1 }),
});
export const ContextSchema = object({ kind: Type.Literal("context"), details: FactsSchema, actions: Type.Array(DestinationSchema),
  attention:Type.Optional(Type.Array(AttentionSignalSchema)),
  selectors: Type.Optional(Type.Array(ObjectSelectorSchema)),
  presentation: Type.Optional(object({ kind: Type.Literal("media-object"), media: text(), description: Type.Optional(text()) })),
});
export const ReviewSchema = object({ kind: Type.Literal("review"), details: FactsSchema, recovery: Type.Optional(text()) });
const MessageSchema = object({ kind: Type.Literal("message"), text: text() });
export const UtilitiesContentSchema = object({ kind: Type.Literal("utilities"), actions: Type.Array(UtilityActionSchema, { minItems: 1 }) });
const GeneralContentSchema = Type.Union([FactsSchema, FormSchema, ContextSchema, ReviewSchema, MessageSchema, InformationSchema]);
export const FrameContentSchema = Type.Union([GeneralContentSchema, UtilitiesContentSchema]);
export const SurfaceFrameVersion = "desert.surface-frame/6" as const;
const common = { version: Type.Literal(SurfaceFrameVersion), top: TopToolbarSchema };
const DismissActionSchema = actionSchema(CloseIntentSchema);
const MessageTopSchema = object({ ...TopToolbarSchema.properties, primary: Type.Optional(Type.Never()), trailing: Type.Optional(Type.Array(Type.Never())) });
const ContextTopSchema = object({ ...TopToolbarSchema.properties,
  primary: Type.Optional(Type.Never()),
  trailing: Type.Optional(Type.Array(actionSchema(Type.Union([RecoverIntentSchema, JourneyIntentSchema])))),
});
const DismissBottomSchema = object({ secondary: Type.Optional(DismissActionSchema), primary: Type.Optional(Type.Never()) });
export const SurfaceFrameSchema = Type.Union([
  object({ ...common, kind: Type.Literal("context"), top: ContextTopSchema,
    content: Type.Union([FactsSchema, ContextSchema, MessageSchema]),
    bottom: object({ secondary: Type.Optional(NavigationActionSchema), primary: Type.Optional(Type.Never()) }),
  }),
  object({ ...common, kind: Type.Literal("message"), top: MessageTopSchema, content: MessageSchema, bottom: DismissBottomSchema }),
  object({ ...common, kind: Type.Literal("utilities"), top: MessageTopSchema, content: UtilitiesContentSchema, bottom: DismissBottomSchema }),
  object({ ...common, kind: Type.Literal("journey"), navigation: Type.Optional(Type.Literal("steps")), content: GeneralContentSchema, bottom: BottomToolbarSchema }),
  object({ ...common, kind: Type.Literal("confirmation"), content: MessageSchema, bottom: BottomToolbarSchema }),
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
  if (content.kind === "context" && content.presentation &&
    (!content.details.images?.includes(content.presentation.media) ||
      (content.presentation.description && !content.details.fields.includes(content.presentation.description)))) {
    throw new Error("INVALID_MEDIA_OBJECT_FIELDS");
  }
  if (details && (new Set(details.fields).size !== details.fields.length ||
    details.multiline?.some(field => !details.fields.includes(field)) ||
    details.images?.some(field => !details.fields.includes(field) || details.multiline?.includes(field)) ||
    details.tags?.some(field => !details.fields.includes(field) || details.multiline?.includes(field) || details.images?.includes(field)))) {
    throw new Error("INVALID_SURFACE_FRAME_FIELDS");
  }
  if (details && details.fields.some(field => {
    if (!Object.hasOwn(details.facts, field)) return false;
    const value = details.facts[field];
    return Array.isArray(value) !== Boolean(details.tags?.includes(field)) ||
      (typeof value === "object" && !Array.isArray(value)) !== Boolean(details.images?.includes(field));
  })) {
    throw new Error("INVALID_SURFACE_FRAME_FACT_REPRESENTATION");
  }
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
  const topIds = [snapshot.top.leading, snapshot.top.primary, ...(snapshot.top.trailing ?? [])]
    .filter(action => action !== undefined).map(action => intentKey(action.intent));
  if (new Set(ids).size !== ids.length || new Set(topIds).size !== topIds.length ||
    (snapshot.content.kind === "form" && !submitsJourney(snapshot.bottom.primary?.intent, snapshot.content.submit))) {
    throw new Error("INVALID_SURFACE_FRAME_ACTIONS");
  }
  return freezeDeep(snapshot);
}
