import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { InformationItemSchema } from "../interaction/information-content.ts";
import { TagNodeSchema, ImageNodeSchema, AvatarNodeSchema } from "../interaction/extended-nodes.ts";
import { ActionIconSchema } from "../interaction/toolbar.ts";
import { FeaturedMediaSchema } from "../public-catalog/schema.ts";
import { closed, immutable, name, text } from "./definition.ts";

export const ViewVersion = "desert.view/1" as const;
export const ViewLimits = Object.freeze({
  catalogSize: 64, referenceDepth: 16, expandedViews: 1024,
  inputDepth: 32, inputNodes: 16384,
});

/** Read-only canonical leaves only. Action, input and journey nodes are not accepted. */
export const ViewLeafSchema = immutable(Type.Union([
  ...InformationItemSchema.anyOf, TagNodeSchema, ImageNodeSchema, AvatarNodeSchema,
]));
export const ViewHeaderSchema = closed({
  kind: Type.Literal("header"), id: name, title: text, subtitle: text,
  media: Type.Optional(FeaturedMediaSchema),
});
/** Data shapes and authority belong to the bound canonical journey, never the View. */
export const ViewBoundContentSchema = immutable(Type.Union([
  closed({ kind: Type.Literal("collection"), id: name, input: name, output: name }),
  closed({ kind: Type.Literal("form"), id: name, input: name }),
  closed({ kind: Type.Literal("context"), id: name, input: name }),
]));
export const ViewCatalogContentSchema = closed({ kind: Type.Literal("visual-catalog"), id: name });
export const ViewItemSchema = immutable(Type.Union([...ViewLeafSchema.anyOf, ...ViewBoundContentSchema.anyOf]));
export const ViewStackSchema = closed({
  kind: Type.Literal("stack"), id: name, title: text, description: Type.Optional(text),
  items: Type.Array(ViewItemSchema, { minItems: 1 }),
});
export const ViewContentSchema = immutable(Type.Union([
  ViewHeaderSchema, ViewStackSchema, ViewCatalogContentSchema, ...ViewItemSchema.anyOf,
]));
export const ViewToolbarSchema = closed({
  kind: Type.Literal("toolbar"),
  actions: Type.Array(closed({
    output: name, label: text, icon: ActionIconSchema, disabled: Type.Optional(Type.Boolean()),
  })),
});
export const ViewRefSchema = closed({ kind: Type.Literal("view"), view: name });
export const ViewSchema = closed({
  version: Type.Literal(ViewVersion), id: name,
  outputs: Type.Optional(Type.Array(name)),
  topDock: Type.Optional(ViewToolbarSchema), bottomDock: Type.Optional(ViewToolbarSchema),
  leftDock: Type.Optional(ViewRefSchema), rightDock: Type.Optional(ViewRefSchema),
  content: Type.Array(ViewContentSchema),
});

export type View = Frozen<Static<typeof ViewSchema>>;
export type ViewLeaf = Frozen<Static<typeof ViewLeafSchema>>;
export type ViewHeader = Frozen<Static<typeof ViewHeaderSchema>>;
export type ViewStack = Frozen<Static<typeof ViewStackSchema>>;
export type ViewContent = Frozen<Static<typeof ViewContentSchema>>;
export type ViewToolbar = Frozen<Static<typeof ViewToolbarSchema>>;
export type ViewRef = Frozen<Static<typeof ViewRefSchema>>;
export type ViewItem = Frozen<Static<typeof ViewItemSchema>>;
export type ViewBoundContent = Frozen<Static<typeof ViewBoundContentSchema>>;
