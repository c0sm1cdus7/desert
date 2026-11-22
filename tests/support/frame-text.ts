// Reads a request message as one text: its tail first (it starts with Alcance), then the own thread's kept blocks.
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
const blocks = Type.Array(Type.Object({ text: Type.String() }));
export function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Value.Check(blocks, content)) return "";
  const texts = content.map(block => block.text);
  return [texts.at(-1) ?? "", ...texts.slice(0, -1)].join("\n\n");
}
