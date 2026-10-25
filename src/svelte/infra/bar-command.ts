// One command of a bar (DESIGN §3.2): a toolbar action, and the id of the form it submits when it is a submit command.
// Bar's contract references the schema; its callers map their toolbars onto it. A bar control is a command local to the
// surface that is no surface intent (the media viewer's zoom): the bar raises its `id` and the surface acts on it.
import { Type, type Static } from "@sinclair/typebox";
import { ActionIconSchema, ToolbarActionSchema } from "../../interaction/toolbar.ts";
import { text } from "../../views/definition.ts";
import type { Frozen } from "../../json.ts";

export const BarCommandSchema = Type.Object({
  ...ToolbarActionSchema.properties,
  submit: Type.Optional(Type.String({ minLength: 1 })),
}, { additionalProperties: false });
export type BarCommand = Frozen<Static<typeof BarCommandSchema>>;

export const BarControlSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  label: text,
  icon: ActionIconSchema,
  state: Type.Union([Type.Literal("ready"), Type.Literal("unavailable")]),
}, { additionalProperties: false });
export type BarControl = Frozen<Static<typeof BarControlSchema>>;
