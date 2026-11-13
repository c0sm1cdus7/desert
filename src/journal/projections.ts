// A local projection cache preserves Maps and Sets; the journal remains the source of truth.
import { journalTexts } from "../texts/journal.texts.ts";
import { createHash } from "node:crypto";
import { serialize } from "node:v8";
import { savedFold, encodeFold } from "./snapshot-format.ts";
type Placed = Readonly<{ seq: number }>;
export class ProjectionCache<S, E extends Placed> {
  state: S;
  seq = 0;
  readonly compatible: boolean;
  private readonly initial: S;
  private readonly identity: string;
  private readonly journal: string;
  private readonly discarded: (reason: string) => void;
  private saved = false;
  private readonly reduce: (state: S, event: E) => S;
  constructor(
    initial: S,
    reduce: (state: S, event: E) => S,
    bytes: unknown,
    last = Number.MAX_SAFE_INTEGER,
    identity = "",
    journal = "",
    discarded: (reason: string) => void = () => {},
  ) {
    this.initial = initial;
    this.discarded = discarded;
    this.identity = identity;
    this.journal = journal;
    this.reduce = reduce;
    const saved = savedFold<S>(bytes, last, identity, journal, discarded);
    this.compatible = saved !== undefined;
    this.saved = this.compatible;
    this.state = saved ? saved.state : initial;
    this.seq = saved?.seq ?? 0;
  }
  reset(): void {
    if (this.saved) this.discarded(journalTexts.dependentFold);
    this.saved = false;
    this.seq = 0;
    this.state = this.initial;
  }
  fold(event: E): S {
    if (event.seq !== this.seq + 1) throw new Error(`Projection sequence gap: ${this.seq} → ${event.seq}`);
    this.state = this.reduce(this.state, event);
    this.seq = event.seq;
    return this.state;
  }
  encode(): Uint8Array {
    return encodeFold(this.seq, this.state, this.identity, this.journal);
  }
  /** Where it stands now, as a way back to it: what was folded after is forgotten. */
  mark(): () => void {
    const { state, seq } = this;
    return () => {
      this.state = state;
      this.seq = seq;
    };
  }
}
/** Dependent folds advance together; a partial cache set falls back to the complete journal. */
export class ProjectionGroup<E extends Placed> {
  readonly caches = new Map<
    string,
    Pick<ProjectionCache<unknown, E>, "seq" | "compatible" | "reset" | "fold" | "encode" | "mark">
  >();
  add<S>(
    name: string,
    initial: S,
    reduce: (state: S, event: E) => S,
    bytes: unknown,
    last: number,
    identity = "",
    journal = "",
    discarded: (reason: string) => void = () => {},
  ) {
    const cache = new ProjectionCache(initial, reduce, bytes, last, identity, journal, discarded);
    this.caches.set(name, cache);
    return () => cache.state;
  }
  after(): number {
    const caches = [...this.caches.values()];
    if (caches.some(cache => !cache.compatible) || new Set(caches.map(cache => cache.seq)).size > 1)
      caches.forEach(cache => cache.reset());
    return caches[0]?.seq ?? 0;
  }
  fold(event: E): null {
    for (const cache of this.caches.values()) cache.fold(event);
    return null;
  }
  /** Where every fold stands now, as a way back to it for all of them together. */
  mark(): () => void {
    const back = [...this.caches.values()].map(cache => cache.mark());
    return () => back.forEach(restore => restore());
  }
}
/** A name for one shape of what is kept: what was kept under another shape is never read as this one. */
export const shapeOf = (...parts: readonly unknown[]): string =>
  createHash("sha256").update(serialize(parts)).digest("hex").slice(0, 16);
export const emptyMap = <T>(): ReadonlyMap<string, T> => new Map();
export const listOf = <T>(...values: T[]): readonly T[] => values;
export const initial = <T>(value: T): Readonly<T> => value;
