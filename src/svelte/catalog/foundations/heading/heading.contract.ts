// The props of Heading. `kind` is the meaning and picks the type role and level: display (a lock name, an onboarding
// headline), page (a place or document title), section (a rail, toolbar, dialog or card title) and group (a field
// group's legend, in the caption role). Only a display or page title is a focus target (`focusKey` also registers it in
// the nearest focus scope, so a caller moves focus to it by key), only a section carries an `id` (what labels its
// region), only a group marks `required`. `align` overrides the inherited alignment. The entry
// checks the exact combination at runtime against this same schema (heading-content.ts).
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";

export const HeadingContract = {
  props: Type.Union([
    Type.Object({
      kind: Type.Literal("display"), text: text, align: Type.Optional(Type.Union([Type.Literal("start"), Type.Literal("center")])),
      focusTarget: Type.Optional(Type.Boolean()), focusKey: Type.Optional(Type.String({ minLength: 1 })), id: Type.Optional(Type.Undefined()), required: Type.Optional(Type.Undefined()),
    }, { additionalProperties: false }),
    Type.Object({
      kind: Type.Literal("page"), text: text, align: Type.Optional(Type.Union([Type.Literal("start"), Type.Literal("center")])),
      focusTarget: Type.Optional(Type.Boolean()), focusKey: Type.Optional(Type.String({ minLength: 1 })), id: Type.Optional(Type.Undefined()), required: Type.Optional(Type.Undefined()),
    }, { additionalProperties: false }),
    Type.Object({
      kind: Type.Literal("section"), text: text, align: Type.Optional(Type.Union([Type.Literal("start"), Type.Literal("center")])),
      focusTarget: Type.Optional(Type.Undefined()), focusKey: Type.Optional(Type.Undefined()), id: Type.Optional(Type.String({ minLength: 1 })), required: Type.Optional(Type.Undefined()),
    }, { additionalProperties: false }),
    Type.Object({
      kind: Type.Literal("group"), text: text, align: Type.Optional(Type.Union([Type.Literal("start"), Type.Literal("center")])),
      focusTarget: Type.Optional(Type.Undefined()), focusKey: Type.Optional(Type.Undefined()), id: Type.Optional(Type.Undefined()), required: Type.Optional(Type.Boolean()),
    }, { additionalProperties: false }),
  ]),
  marks: ["data-place-title"],
} as const;
