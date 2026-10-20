import { Type } from "@sinclair/typebox";

const text = () => Type.String({ minLength: 1 });
/** Closed, ordered information only; no markup, styling, or renderer callbacks. */
export const InformationItemSchema = Type.Union([
  Type.Object({ kind: Type.Literal("text"), text: text() }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal("fact"), label: text(), value: Type.Union([Type.String(), Type.Null()]) },
    { additionalProperties: false }),
]);
export const InformationSchema = Type.Object({ kind: Type.Literal("information"),
  items: Type.Array(InformationItemSchema, { minItems: 1 }),
}, { additionalProperties: false });
