// One command of a bar (DESIGN §3.2): a toolbar action, and the id of the form it submits when it is a submit command.
// Bar's contract references the schema; its callers map their toolbars onto it.
import { Type, type Static } from "@sinclair/typebox";
import { ToolbarActionSchema } from "../../interaction/toolbar.ts";
import type { Frozen } from "../../json.ts";

export const BarCommandSchema = Type.Object({
  ...ToolbarActionSchema.properties,
  submit: Type.Optional(Type.String({ minLength: 1 })),
}, { additionalProperties: false });
export type BarCommand = Frozen<Static<typeof BarCommandSchema>>;
