// The props of MediaControl: one resolved media node, a tag, an avatar or an image, as the domain schemas define them.
import { Type } from "@sinclair/typebox";
import { AvatarNodeSchema, ImageNodeSchema, TagNodeSchema } from "../../../../interaction/extended-nodes.ts";

export const MediaControlContract = {
  props: Type.Object({ node: Type.Union([AvatarNodeSchema, ImageNodeSchema, TagNodeSchema]) }, { additionalProperties: false }),
} as const;
