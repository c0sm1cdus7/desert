// The bus of a house: every fact is written through it, and everyone who listens hears each one once it is written.
import { journalTexts } from "../texts/journal.texts.ts";
import type { Emission, Event, Foreign, Position } from "./facts.ts";
import type { HouseEmission, HouseEvent, HouseKind } from "../house/facts.ts";
const ofKind = <E extends Readonly<{ kind: string }>, K extends string>(event: E, kind: K): event is E & { kind: K } =>
  event.kind === kind;
type Write = { committed: boolean; undo: (() => void)[] };
export class Bus<P extends Foreign = Foreign> {
  private readonly listeners = new Set<(event: Event<P>) => void>();
  private readonly queue: Event<P>[] = [];
  private readonly writes: Write[] = [];
  private delivering = false;
  private closed = false;
  private readonly append: (emission: Emission<P>) => Event<P>;
  private readonly batch: <T>(write: () => T) => T;
  /** `batch` is how its journal writes several facts whole or not at all; without one, each stands alone. */
  constructor(append: (emission: Emission<P>) => Event<P>, batch: <T>(write: () => T) => T = write => write()) {
    this.append = append;
    this.batch = batch;
  }
  /** What is emitted inside is written whole or not at all. Who listens hears each fact as it is written, as
   * always, and what a listener writes on hearing it is part of the same whole: it stays or goes with it. */
  together<T>(write: () => T): T {
    const scope: Write = { committed: false, undo: [] };
    const queued = this.queue.length;
    this.writes.push(scope);
    try {
      const result = this.batch(write);
      scope.committed = true;
      return result;
    } catch (error) {
      this.queue.splice(queued);
      scope.undo.reverse().forEach(restore => restore());
      throw error;
    } finally {
      scope.undo = [];
      this.writes.pop();
    }
  }
  /** Internal observers restore their own state for every enclosing write that can still fail. */
  onRollback(restore: () => void): void {
    this.writes.forEach(scope => scope.undo.push(restore));
  }
  /** A deferred request keeps the outcome of every enclosing write, including a later outer rollback. */
  confirmation(): () => boolean {
    const scopes = [...this.writes];
    return () => scopes.every(scope => scope.committed);
  }
  emit<K extends HouseKind>(emission: HouseEmission & { kind: K }): HouseEvent<K>;
  emit<E extends P>(emission: E): E & Position;
  emit(emission: Emission<P>): Event<P>;
  emit(emission: Emission<P>): Event<P> {
    if (this.closed) throw new Error(journalTexts.closedBus);
    const event = this.append(emission);
    this.queue.push(event);
    if (!this.delivering) this.drain();
    return event;
  }
  on(listener: (event: Event<P>) => void): () => void;
  on<K extends Event<P>["kind"]>(kind: K, listener: (event: Event<P> & { kind: K }) => void): () => void;
  on<K extends string>(
    kind: K | ((event: Event<P>) => void),
    listener?: (event: Event<P> & { kind: K }) => void,
  ): () => void {
    if (this.closed) throw new Error(journalTexts.closedBus);
    const receive =
      typeof kind === "function"
        ? kind
        : (event: Event<P>) => {
            if (ofKind(event, kind)) listener?.(event);
          };
    this.listeners.add(receive);
    return () => void this.listeners.delete(receive);
  }
  close(): void {
    this.closed = true;
    this.listeners.clear();
  }
  private drain(): void {
    this.delivering = true;
    const failures: unknown[] = [];
    for (let event = this.queue.shift(); event; event = this.queue.shift()) {
      for (const listener of [...this.listeners]) {
        try {
          listener(event);
        } catch (error) {
          failures.push(error);
        }
      }
    }
    this.delivering = false;
    if (failures.length) throw new AggregateError(failures, journalTexts.listenerFailed);
  }
}
