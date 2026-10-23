import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { ResolvedNodeSchema } from "./resolved-node-schema.ts";
import { resolvedNode } from "./resolved-node.ts";

const text = Type.String({ minLength: 1, pattern: "\\S" });
const closed = <P extends import("@sinclair/typebox").TProperties>(properties: P) =>
  Type.Object(properties, { additionalProperties: false });
const StackNodeSchema = Type.Extract(ResolvedNodeSchema, Type.Object({ kind: Type.Union([
  Type.Literal("input.text"), Type.Literal("input.multiline"), Type.Literal("fact"),
  Type.Literal("action"), Type.Literal("availability"), Type.Literal("collection"),
  Type.Literal("catalog.card"), Type.Literal("control.select"), Type.Literal("control.popover"),
  Type.Literal("control.options"), Type.Literal("control.date"), Type.Literal("control.money"),
  Type.Literal("control.files"), Type.Literal("control.tag"), Type.Literal("control.image"), Type.Literal("control.avatar"),
  Type.Literal("control.labels"),
]) }));
export type StackNode = Frozen<Static<typeof StackNodeSchema>>;
export function stackNode(value: unknown): StackNode {
  const node = resolvedNode(value);
  if (!Check(StackNodeSchema, node)) throw new Error("INVALID_PLACE_STACK_NODE");
  return node;
}

export const StackSchema = closed({
  id: Type.String({ pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$" }),
  title: text, description: Type.Optional(text),
  items: Type.Array(StackNodeSchema, { minItems: 1 }),
});
/** No loose content, second heading, visual variants or arbitrary markup. */
export const PlaceContentSchema = closed({
  title: text, subtitle: text, stacks: Type.Array(StackSchema, { minItems: 1 }),
});
export type PlaceContent = Frozen<Static<typeof PlaceContentSchema>>;
export type Stack = PlaceContent["stacks"][number];
export type StackItem = Stack["items"][number];

export function stackNodes(items: readonly StackItem[]): readonly StackNode[] {
  return items;
}

export function placeContent(value: unknown): PlaceContent {
  const result: unknown = jsonSnapshot(value);
  if (!Check(PlaceContentSchema, result)) throw new Error("INVALID_PLACE");
  const ids = result.stacks.map(stack => stack.id);
  if (new Set(ids).size !== ids.length) throw new Error("INVALID_PLACE_STACK_ID");
  const controls = new Set<string>();
  for (const stack of result.stacks) for (const node of stackNodes(stack.items)) {
    resolvedNode(node);
    const identity = "control" in node ? node.control.id :
      node.kind === "input.text" || node.kind === "input.multiline" ? node.name : undefined;
    if (identity !== undefined) {
      if (controls.has(identity)) throw new Error("INVALID_PLACE_CONTROL_ID");
      controls.add(identity);
    }
  }
  return freezeDeep(result);
}
