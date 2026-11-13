// One compatibility decision for saved folds: format, sequence and the identity of their calculations.
import { deserialize, serialize } from "node:v8";
const version = 2;
type Fold<S> = Readonly<{ seq: number; state: S }>;
type Snapshot<S> = Fold<S> & Readonly<{ version: number; identity: string }>;
const placed = <S>(value: unknown, last: number): value is Fold<S> =>
  typeof value === "object" &&
  value !== null &&
  "state" in value &&
  "seq" in value &&
  typeof value.seq === "number" &&
  Number.isSafeInteger(value.seq) &&
  value.seq >= 0 &&
  value.seq <= last;
const compatible = <S>(value: Fold<S> | undefined, identity: string): value is Snapshot<S> =>
  value !== undefined &&
  "version" in value &&
  value.version === version &&
  "identity" in value &&
  value.identity === identity;
/** Previous releases are readable evidence, even when they are not reusable by this release. */
export function readableFold<S>(bytes: unknown, last: number): Fold<S> | undefined {
  if (!(bytes instanceof Uint8Array)) return undefined;
  try {
    const value: unknown = deserialize(bytes);
    return placed<S>(value, last) ? value : undefined;
  } catch {
    return undefined;
  }
}
export function savedFold<S>(bytes: unknown, last: number, identity = ""): Snapshot<S> | undefined {
  const value = readableFold<S>(bytes, last);
  return compatible(value, identity) ? value : undefined;
}
export const encodeFold = (seq: number, state: unknown, identity = ""): Uint8Array =>
  serialize({ version, identity, seq, state });
