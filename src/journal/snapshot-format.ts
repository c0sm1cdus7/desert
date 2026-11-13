// One compatibility decision for saved folds. Reducer identity can extend this envelope in the next revision.
import { deserialize, serialize } from "node:v8";
const version = 2;
type Snapshot<S> = Readonly<{ version: number; seq: number; state: S }>;
const compatible = <S>(value: unknown, last: number): value is Snapshot<S> =>
  typeof value === "object" &&
  value !== null &&
  "version" in value &&
  value.version === version &&
  "state" in value &&
  "seq" in value &&
  typeof value.seq === "number" &&
  Number.isSafeInteger(value.seq) &&
  value.seq >= 0 &&
  value.seq <= last;
export function savedFold<S>(bytes: unknown, last: number): Snapshot<S> | undefined {
  if (!(bytes instanceof Uint8Array)) return undefined;
  try {
    const value: unknown = deserialize(bytes);
    return compatible<S>(value, last) ? value : undefined;
  } catch {
    return undefined;
  }
}
export const encodeFold = (seq: number, state: unknown): Uint8Array => serialize({ version, seq, state });
