// Keep only fingerprints of process credentials so every journal and public surface can redact them.
import { meant } from "../../fields/phrases.ts";
import { createHash } from "node:crypto";
import { mcpTexts } from "../../texts/mcp.texts.ts";
const fingerprints = new Map<number, Set<string>>();
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function protectDoorMaterial(material: string): void {
  const known = fingerprints.get(material.length) ?? new Set<string>();
  known.add(digest(material));
  fingerprints.set(material.length, known);
}
export function scrubVolatileDoorText(text: string): string {
  let covered: Uint8Array | undefined;
  for (const [length, known] of fingerprints) {
    for (let start = 0; start + length <= text.length; start++) {
      if (!known.has(digest(text.slice(start, start + length)))) continue;
      covered ??= new Uint8Array(text.length);
      covered.fill(1, start, start + length);
    }
  }
  if (!covered) return text;
  let result = "";
  for (let i = 0; i < text.length; i++) {
    if (!covered[i]) result += text.charAt(i);
    else if (!covered[i - 1]) result += meant(mcpTexts.redacted);
  }
  return result;
}
