import { addedLabel } from "../labels.ts";
import type { LabelsNode } from "./labels-control.ts";

/** An explicit Add action normalizes only its new label. Existing values and
 * invalid drafts are never rewritten, truncated, or silently discarded. */
export function addWrittenLabel(node: LabelsNode, writing: string):
  { added: true; values: readonly string[] } | { added: false; message: string } {
  const label = addedLabel(writing);
  if (node.disabled) return { added: false, message: "This field is unavailable." };
  if (!label) return { added: false, message: "Enter a label." };
  if (node.values.includes(label)) return { added: false, message: "This label is already added." };
  if (node.values.length >= node.limits.maxItems) return { added: false, message: `Remove a label before adding another. Maximum: ${node.limits.maxItems}.` };
  return { added: true, values: [...node.values, label] };
}
