// Questions remember random references by a session-salted digest, never a cache of material.
import { createHmac, randomUUID } from "node:crypto";
export function questionMaterial() {
  const salt = randomUUID();
  const references = new Map<string, string>();
  return (value: string, position: number): string => {
    const digest = createHmac("sha256", salt).update(String(position)).update("\0").update(value).digest("hex");
    const ref = references.get(digest) ?? `secret:${randomUUID()}`;
    references.set(digest, ref);
    return ref;
  };
}
