import { expect } from "vitest";
import { inspect } from "node:util";
/** Assertions report booleans, so even a regression does not print the planted material. */
export function safeKeyFailure(work: () => unknown, planted: Uint8Array, name?: string): void {
  let error: unknown;
  try {
    work();
  } catch (caught) {
    error = caught;
  }
  expect(error instanceof Error).toBe(true);
  const text = inspect(error) + JSON.stringify(error);
  const bytes = Buffer.from(planted);
  try {
    for (const encoding of ["hex", "base64", "base64url", "utf8"] as const)
      expect(text.includes(bytes.toString(encoding))).toBe(false);
    expect(Buffer.from(text).includes(bytes)).toBe(false);
    expect(text.includes([...bytes].join(","))).toBe(false);
    if (name) expect(text.includes(name)).toBe(true);
  } finally {
    bytes.fill(0);
  }
}
