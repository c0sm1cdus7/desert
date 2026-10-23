import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { InformationItemSchema } from "../interaction/information-content.ts";
import { TagNodeSchema, ImageNodeSchema, AvatarNodeSchema } from "../interaction/extended-nodes.ts";
import { ActionIconSchema } from "../interaction/toolbar.ts";
import { FeaturedMediaSchema } from "../public-catalog/schema.ts";
import { closed, immutable, name, text } from "./definition.ts";
import { MediaLibrarySchema } from "./media-library.ts";
import { FactReferenceSchema } from "./object-presentation.ts";

export const ViewVersion = "desert.view/1" as const;
export const ViewLimits = Object.freeze({
  catalogSize: 64, referenceDepth: 16, expandedViews: 1024,
  inputDepth: 32, inputNodes: 16384,
});

/** Read-only canonical leaves only. Action, input and journey nodes are not accepted. */
export const ViewLeafSchema = immutable(Type.Union([
  ...InformationItemSchema.anyOf, TagNodeSchema, ImageNodeSchema, AvatarNodeSchema,
]));
export const ViewHeaderTitleSchema = immutable(Type.Union([
  text, closed({ kind: Type.Literal("subject-title") }), closed({ kind: Type.Literal("operation-label") }),
  closed({ kind: Type.Literal("product-title") }),
  closed({ kind: Type.Literal("greeting") }),
]));
export const ViewHeaderSchema = closed({
  kind: Type.Literal("header"), id: name, title: ViewHeaderTitleSchema, subtitle: Type.Optional(text),
  media: Type.Optional(FeaturedMediaSchema),
});
/** Data shapes and authority belong to the bound canonical journey, never the View. */
export const ViewBoundContentSchema = immutable(Type.Union([
  closed({ kind: Type.Literal("collection"), id: name, input: name, output: name,
    fields: Type.Optional(Type.Array(FactReferenceSchema, { minItems: 1, uniqueItems: true })),
    presentation: Type.Optional(Type.Union([
      closed({ kind: Type.Literal("media-grid"), image: FactReferenceSchema,
        fit: Type.Optional(FactReferenceSchema), description: Type.Optional(FactReferenceSchema) }),
      closed({ kind: Type.Literal("collection-grid"), title: FactReferenceSchema }),
      closed({ kind: Type.Literal("summary-widget"), title: text, description: text, totalLabel: text }),
    ])) }),
  closed({ kind: Type.Literal("form"), id: name, input: name }),
  closed({ kind: Type.Literal("context"), id: name, input: name,
    fields: Type.Optional(Type.Array(FactReferenceSchema, { uniqueItems: true })),
    presentation: Type.Optional(closed({ kind: Type.Literal("media-object"), media: FactReferenceSchema,
      description: Type.Optional(FactReferenceSchema) })) }),
]));
export const ViewCatalogContentSchema = closed({ kind: Type.Literal("visual-catalog"), id: name });
export const ViewAppearanceContentSchema = closed({ kind: Type.Literal("appearance"), id: name });
export const ViewSystemContentSchema = closed({ kind: Type.Literal("system-status"), id: name });
export const ViewIdentityContentSchema = closed({ kind: Type.Literal("identity"), id: name });
export const ViewAttentionContentSchema = closed({ kind: Type.Literal("attention"), id: name });
export const ViewMediaContentSchema = closed({
  kind: Type.Literal("media-library"), id: name, library: MediaLibrarySchema,
});
export const ViewDestinationLinkSchema = closed({ kind: Type.Literal("destination-link"), id: name, output: name, label: text, icon: Type.Optional(ActionIconSchema) });
export const ViewItemSchema = immutable(Type.Union([...ViewLeafSchema.anyOf, ...ViewBoundContentSchema.anyOf, ViewDestinationLinkSchema]));
export const ViewStackSchema = closed({
  kind: Type.Literal("stack"), id: name, title: text, description: Type.Optional(text),
  items: Type.Array(ViewItemSchema, { minItems: 1 }),
});
export const ViewContentSchema = immutable(Type.Union([
  ViewHeaderSchema, ViewStackSchema, ViewCatalogContentSchema, ViewMediaContentSchema, ViewAppearanceContentSchema, ViewSystemContentSchema, ViewIdentityContentSchema, ViewAttentionContentSchema,
  closed({ kind: Type.Literal("destination") }), closed({ kind: Type.Literal("navigation") }),
  ...ViewItemSchema.anyOf,
]));
export const ViewToolbarSchema = closed({
  kind: Type.Literal("toolbar"),
  actionGroup: Type.Optional(Type.Literal("create")),
  actions: Type.Array(closed({
    output: name, label: text, icon: ActionIconSchema, disabled: Type.Optional(Type.Boolean()),
  })),
});
export const ViewRefSchema = closed({ kind: Type.Literal("view"), view: name });
export const ViewSchema = closed({
  version: Type.Literal(ViewVersion), id: name,
  layout: Type.Optional(Type.Union([Type.Literal("overview"), Type.Literal("gallery")])),
  outputs: Type.Optional(Type.Array(name)),
  topDock: Type.Optional(ViewToolbarSchema), bottomDock: Type.Optional(ViewToolbarSchema),
  leftDock: Type.Optional(ViewRefSchema), rightDock: Type.Optional(ViewRefSchema),
  content: Type.Array(ViewContentSchema),
});

export type View = Frozen<Static<typeof ViewSchema>>;
export type ViewLeaf = Frozen<Static<typeof ViewLeafSchema>>;
export type ViewHeader = Frozen<Static<typeof ViewHeaderSchema>>;
export type ViewHeaderTitle = Frozen<Static<typeof ViewHeaderTitleSchema>>;
export type ViewStack = Frozen<Static<typeof ViewStackSchema>>;
export type ViewContent = Frozen<Static<typeof ViewContentSchema>>;
export type ViewToolbar = Frozen<Static<typeof ViewToolbarSchema>>;
export type ViewRef = Frozen<Static<typeof ViewRefSchema>>;
export type ViewItem = Frozen<Static<typeof ViewItemSchema>>;
export type ViewBoundContent = Frozen<Static<typeof ViewBoundContentSchema>>;
export type ViewMediaContent = Frozen<Static<typeof ViewMediaContentSchema>>;
