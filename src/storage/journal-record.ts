// SQLite rows preserve the vocabulary envelope and deterministic causal identity.
import { createHash } from "node:crypto";
import { layerOf } from "../house/facts.ts";
import type { Emission, Event, Foreign, Vocabulary } from "../journal/facts.ts";
import { journalTexts } from "../texts/journal.texts.ts";
const parse = (value: unknown): unknown => {
  if (typeof value !== "string") throw new Error(journalTexts.invalidEvent);
  return JSON.parse(value);
};
/** A row holds a fact without its layer: the kind says whose it is, so a kind the house adopts later still reads. */
export const factOf = ({ process, ...fact }: Readonly<Record<string, unknown>>): unknown => ({
  ...fact,
  ...(typeof process === "string" ? { process } : {}),
  layer: layerOf(String(fact.kind)),
  cause: parse(fact.cause),
  data: parse(fact.data),
});
/** Derive identity from provenance, kind, writer and the ordinal among their effects. */
export function derivedId(emission: Emission, ordinal: number): string {
  return createHash("sha256")
    .update(JSON.stringify([emission.cause, emission.by, emission.kind, ordinal]))
    .digest("hex");
}
/** What is stored has no process when it has none, so the event folded live is the event replay will read. */
export const stored = ({ process, ...fact }: Emission) => (process === undefined ? fact : { ...fact, process });

/** A fact this program does not read stops the house where it is found, named: it is never skipped. */
export function readFact<P extends Foreign>(words: Vocabulary<P>, row: Readonly<Record<string, unknown>>): Event<P> {
  try {
    return words.read(factOf(row));
  } catch {
    throw new Error(journalTexts.unreadable(Number(row.seq), String(row.kind)));
  }
}
