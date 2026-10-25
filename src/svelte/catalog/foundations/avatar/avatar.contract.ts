// The props of Avatar. `source` is a seed (a deterministic drawing, never letters), or a picture with the seed drawn
// while it loads or when it cannot load. There is no initials source: a person is never spelled. `size` is the portrait of an identity, its
// compact form, or the mark of a row. `label` names it for assistive technology; without one it is decorative. With
// `interaction: "shuffle"` the seed avatar is a button, named by `shuffleLabel`, whose `shuffle` event is a new seed.
import { Type } from "@sinclair/typebox";
import { ImageSourceSchema } from "../../../../interaction/image-source.ts";
import { text } from "../../../../views/definition.ts";

export const AvatarContract = {
  props: Type.Intersect([Type.Object({
    size: Type.Union([Type.Literal("portrait"), Type.Literal("compact"), Type.Literal("row")]),
    label: Type.Optional(text),
  }, { additionalProperties: false }), Type.Union([
    Type.Object({
      interaction: Type.Literal("none"),
      source: Type.Union([
        Type.Object({ kind: Type.Literal("seed"), seed: Type.String({ minLength: 1 }) }, { additionalProperties: false }),
        Type.Object({ kind: Type.Literal("image"), source: ImageSourceSchema, seed: Type.String({ minLength: 1 }) },
          { additionalProperties: false }),
      ]),
      shuffleLabel: Type.Optional(Type.Undefined()),
      disabled: Type.Optional(Type.Undefined()),
    }, { additionalProperties: false }),
    Type.Object({
      interaction: Type.Literal("shuffle"),
      source: Type.Object({ kind: Type.Literal("seed"), seed: Type.String({ minLength: 1 }) }, { additionalProperties: false }),
      shuffleLabel: text,
      disabled: Type.Optional(Type.Boolean()),
    }, { additionalProperties: false }),
  ])]),
  events: Type.Object({ shuffle: Type.String() }, { additionalProperties: false }),
  marks: ["data-avatar-seed", "data-avatar-shuffle"],
} as const;
