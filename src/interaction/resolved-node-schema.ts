import { Type, type TProperties, type TSchema } from "@sinclair/typebox";
import { ControlNodeSchema } from "./control-nodes.ts";
import { FactsSchema, FormSchema, TextFormFieldSchema, ContextSchema, ReviewSchema, SurfaceFrameSchema } from "./surface-frame.ts";
import { ToolbarActionSchema, TopToolbarSchema, actionSchema } from "./toolbar.ts";
import { CatalogFeaturedSchema, CatalogItemSchema, CatalogHomeSchema, CatalogDetailSchema } from "../public-catalog/node-schema.ts";
import { CatalogEventSchema } from "../public-catalog/events.ts";
import { InputMaskSchema } from "./input-mask.ts";
import { LabelsNodeSchema } from "./labels-control.ts";
import { AssetReferenceSchema } from "../assets/types.ts";
import {AttentionSignalSchema} from '../attention.ts';

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
const version = Type.Literal("desert.bank-node/1");
const node = <K extends string, P extends TProperties>(kind: K, properties: P) => object({ version, kind: Type.Literal(kind), ...properties });
const control = <K extends string, S extends TSchema>(kind: K, schema: S) => node(kind, { control: schema });
const input = { name: text(), label: text(), value: Type.String(), required: Type.Boolean(),
  disabled: Type.Boolean(), error: Type.Optional(text()), helper: Type.Optional(text()), maxLength: TextFormFieldSchema.properties.maxLength };

/** Local renderer operations cannot be confused with product journey identities. */
export const LocalIntentSchema = Type.Union([
  object({ kind: Type.Literal("catalog"), open: Type.Boolean() }),
  object({ kind: Type.Literal("search.clear") }),
  object({ kind: Type.Literal("transient.open") }),
  object({ kind: Type.Literal("selection.clear") }),
  object({ kind: Type.Literal("specimen"), operation: Type.Union([
    Type.Literal("open"), Type.Literal("press"), Type.Literal("finish"),
  ]) }),
]);
const action = Type.Union([ToolbarActionSchema, actionSchema(LocalIntentSchema),
  actionSchema(Type.Union([CatalogEventSchema.anyOf[0], CatalogEventSchema.anyOf[1]]))]);
const record = object({ id: text(), version: Type.Integer({ minimum: 1 }), facts: FactsSchema.properties.facts });
export const CollectionNodeSchema = node("collection", {
  presentation: Type.Optional(Type.Union([
    object({ kind: Type.Literal("media-grid"), image: text(), fit: Type.Optional(text()), description: Type.Optional(text()),
      layout: Type.Optional(Type.Union([Type.Literal("grid"), Type.Literal("list")])) }),
    object({ kind: Type.Literal("collection-grid"), title: text(), previews: Type.Array(object({ id: text(),
      count: Type.Integer({ minimum: 0 }), media: Type.Optional(AssetReferenceSchema) }), { maxItems: 200 }) }),
    object({ kind: Type.Literal("summary-widget"), title: text(), description: text(), totalLabel: text(), field: text(),
      segments: Type.Array(object({ value:text(), label:text() }), {minItems:2,maxItems:6}), truncated: Type.Optional(Type.Boolean()) }),
  ])),
  object: text(), fields: Type.Array(text(), { minItems: 1, uniqueItems: true }), labels: FactsSchema.properties.labels,
  valueLabels: Type.Optional(Type.Record(Type.String(), Type.Record(Type.String(), text()))),
  attention:Type.Optional(Type.Record(Type.String(),Type.Array(AttentionSignalSchema))),
  createLabel: Type.Optional(text()), records: Type.Array(record), disabled: Type.Boolean(), loaded: Type.Boolean(),
  connection: Type.Optional(Type.Union([Type.Literal('loading'), Type.Literal('ready'), Type.Literal('offline')])),
  selectedId: Type.Union([Type.Null(), text()]),
});

/** The complete bank's serializable grammar. Web callbacks and host handles are not values here. */
export const ResolvedNodeSchema = Type.Union([
  node("input.text", { ...input, mask: Type.Optional(InputMaskSchema) }), node("input.multiline", input),
  node("fact", { details: FactsSchema }),
  node("action", { action, role: Type.Union([Type.Literal("primary"), Type.Literal("secondary")]), form: Type.Optional(Type.Boolean()) }),
  node("availability", TopToolbarSchema.properties.availability.properties),
  CollectionNodeSchema,
  node("form", { content: FormSchema }), node("context", { content: ContextSchema }), node("review", { content: ReviewSchema }),
  node("transient", { label: text(), open: Type.Boolean(), locked: Type.Boolean(), frame: SurfaceFrameSchema }),
  node("problem", { open: Type.Boolean(), title: text(), description: text(), locked: Type.Boolean(),
    severity: Type.Union([Type.Literal("error"), Type.Literal("warning")]) }),
  control("control.select", ControlNodeSchema.anyOf[0]), control("control.popover", ControlNodeSchema.anyOf[1]),
  control("control.files", ControlNodeSchema.anyOf[2]), control("control.options", ControlNodeSchema.anyOf[3]),
  control("control.money", ControlNodeSchema.anyOf[4]), control("control.date", ControlNodeSchema.anyOf[5]),
  control("control.tag", ControlNodeSchema.anyOf[6]), control("control.image", ControlNodeSchema.anyOf[7]),
  control("control.avatar", ControlNodeSchema.anyOf[8]),
  control("control.labels", LabelsNodeSchema),
  CatalogFeaturedSchema, CatalogItemSchema, CatalogHomeSchema, CatalogDetailSchema,
]);
