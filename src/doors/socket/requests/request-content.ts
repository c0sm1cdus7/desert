// Canonical JSON is walked iteratively: a deeply nested input must not overflow before the house can reject it.
import { createHash } from "node:crypto";
export function requestContent(value: unknown): string {
  const hash = createHash("sha256");
  const pending: unknown[] = [value];
  while (pending.length) {
    const item = pending.pop();
    if (Array.isArray(item)) {
      hash.update(`array:${item.length}:`);
      const values: unknown[] = item;
      for (let index = values.length - 1; index >= 0; index--) pending.push(values[index]);
    } else if (item !== null && typeof item === "object") {
      const entries = Object.entries(item).sort(([a], [b]) => a.localeCompare(b));
      hash.update(`object:${entries.length}:`);
      for (const [key, data] of entries.reverse()) pending.push(data, key);
    } else hash.update(`${typeof item}:${JSON.stringify(item)};`);
  }
  return hash.digest("hex");
}
