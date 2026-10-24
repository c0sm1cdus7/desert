// The props of PlaceHeading. `context: "place"` heads a workspace place: its title is the focusable page title the shell
// docks into the toolbar, over an optional featured image, gallery or video (`media`). `context: "embedded"` heads
// content inside a place (a catalog page, a document), with an optional `background` image and no focus target.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import { FeaturedMediaSchema } from "../../../infra/place-identity.ts";

export const PlaceHeadingContract = {
  props: Type.Object({
    title: text,
    subtitle: Type.Optional(Type.Union([text, Type.Undefined()])),
    media: Type.Optional(Type.Union([FeaturedMediaSchema, Type.Undefined()])),
    context: Type.Union([Type.Literal("place"), Type.Literal("embedded")]),
    background: Type.Optional(Type.Object({ asset: Type.String(), alt: Type.String() }, { additionalProperties: false })),
  }, { additionalProperties: false }),
  marks: ["data-place-header", "data-dock-above", "data-featured-media", "data-media-unavailable", "data-place-subtitle",
    "data-embedded-place-heading", "data-header-media"],
} as const;
