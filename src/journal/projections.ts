// A local projection cache preserves Maps and Sets; the journal remains the source of truth.
import { createHash } from "node:crypto";
import { deserialize, serialize } from "node:v8";
type Placed = Readonly<{ seq: number }>;
export class ProjectionCache<S, E extends Placed> {
  state: S;
  seq = 0;
  private readonly initial: S;
  private readonly reduce: (state: S, event: E) => S;
  constructor(initial: S, reduce: (state: S, event: E) => S, bytes: unknown) {
    this.initial = initial;
    this.reduce = reduce;

    this.state = initial;
    if (!(bytes instanceof Uint8Array)) return;
    // The journal's projection key owns this type; only its reducer writes these bytes.
    const matches = (value: unknown): value is { seq: number; state: S } =>
      typeof value === "object" &&
      value !== null &&
      "seq" in value &&
      "state" in value &&
      typeof value.seq === "number" &&
      Number.isSafeInteger(value.seq) &&
      value.seq >= 0;
    try {
      const cached: unknown = deserialize(bytes);
      if (matches(cached)) {
        this.state = cached.state;
        this.seq = cached.seq;
      }
    } catch {
      /* A damaged cache is discarded; the caller replays from the beginning. */
    }
  }
  reset(): void {
    this.seq = 0;
    this.state = this.initial;
  }
  fold(event: E): S {
    this.state = this.reduce(this.state, event);
    this.seq = event.seq;
    return this.state;
  }
  encode(): Uint8Array {
    return serialize({ seq: this.seq, state: this.state });
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
  readonly caches = new Map<string, Pick<ProjectionCache<unknown, E>, "seq" | "reset" | "fold" | "encode" | "mark">>();
  add<S>(name: string, initial: S, reduce: (state: S, event: E) => S, bytes: unknown) {
    const cache = new ProjectionCache(initial, reduce, bytes);
    this.caches.set(name, cache);
    return () => cache.state;
  }
  after(): number {
    const caches = [...this.caches.values()];
    if (new Set(caches.map(cache => cache.seq)).size > 1) caches.forEach(cache => cache.reset());
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
