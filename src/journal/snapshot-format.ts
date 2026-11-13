// One compatibility decision for saved folds: format, sequence, source journal and calculations.
import { journalTexts } from "../texts/journal.texts.ts";
import { deserialize, serialize } from "node:v8";
const version = 3;
type Fold<S> = Readonly<{ seq: number; state: S }>;
type Snapshot<S> = Fold<S> & Readonly<{ version: number; identity: string; journal: string }>;
export type FoldWarning = Readonly<{ name: string; reason: string }>;
const placed = <S>(value: unknown, last: number): value is Fold<S> =>
  typeof value === "object" &&
  value !== null &&
  "state" in value &&
  "seq" in value &&
  typeof value.seq === "number" &&
  Number.isSafeInteger(value.seq) &&
  value.seq >= 0 &&
  value.seq <= last;
const decode = (bytes: unknown): unknown => {
  if (!(bytes instanceof Uint8Array)) return undefined;
  try {
    return deserialize(bytes);
  } catch {
    return undefined;
  }
};
export function savedFold<S>(
  bytes: unknown,
  last: number,
  identity = "",
  journal = "",
  discarded: (reason: string) => void = () => {},
): Snapshot<S> | undefined {
  if (bytes === undefined) return undefined;
  const value = decode(bytes);
  let reason: string;
  if (typeof value !== "object" || value === null) reason = journalTexts.unreadableFold;
  else if (!("version" in value) || value.version !== version) reason = journalTexts.oldFold;
  else if (!placed<S>(value, last)) reason = journalTexts.aheadFold;
  else if (!("journal" in value) || value.journal !== journal) reason = journalTexts.foreignFold;
  else if (!("identity" in value) || value.identity !== identity) reason = journalTexts.changedFold;
  else return { version, journal, identity, seq: value.seq, state: value.state };
  discarded(reason);
  return undefined;
}
export const encodeFold = (seq: number, state: unknown, identity = "", journal = ""): Uint8Array =>
  serialize({ version, identity, journal, seq, state });
