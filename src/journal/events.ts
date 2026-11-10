// One journal for the house's facts and a program's: the house reads its own and carries the program's unread.
import { Type, type Static, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { object, preference } from "../catalogs/acts.ts";
import { toolLimits } from "../catalogs/levers.ts";
import { journalTexts } from "../texts/journal.texts.ts";
const literals = <T extends string>(...values: T[]) => Type.Union(values.map(value => Type.Literal(value)));
const text = Type.String();
const name = Type.String({ minLength: toolLimits.minText });
const names = Type.Array(name);
const instant = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
const actStatus = literals("accepted", "rejected", "draft", "inconclusive", "interrupted");
/** What every house writes, whatever program lives in it. */
export const houseCatalog = {
  "house-created": object({}),
  granted: object({ identity: name, tools: names }),
  preferred: preference,
  "channel-created": object({ channel: name, members: names }),
  boot: object({}),
  act: object({ object: name, option: name, input: Type.Unknown(), through: Type.Optional(instant) }),
  "act-started": object({ act: name, object: name, option: name }),
  "act-result": object({ act: name, status: actStatus, reason: text, output: Type.Optional(Type.Boolean()) }),
  "tool-entry": object({
    tool: name,
    target: name,
    author: name,
    text,
    draft: Type.Optional(Type.Boolean()),
    attention: Type.Optional(Type.Boolean()),
    silent: Type.Optional(Type.Boolean()),
    recipient: Type.Optional(name),
    detail: Type.Optional(Type.Unknown()),
  }),
  "act-done": object({ object: name, act: name, text, recipient: Type.Optional(name) }),
  attended: object({ target: name }),
  unattended: object({ target: name }),
  attention: object({ tool: name, delay: Type.Union([instant, Type.Null()]) }),
  stimulus: object({ tool: name }),
  "wake-at": object({ id: name, at: Type.Union([instant, Type.Null()]) }),
  woke: object({ id: name }),
};
export type Catalog = Readonly<Record<string, TSchema>>;
export type Layer = "house" | "program";
type Provenance = Readonly<{ by: string; cause: readonly string[]; process?: string | undefined }>;
type Fact<L extends Layer, K extends string, D> = Provenance & Readonly<{ layer: L; kind: K; data: D }>;
/** Every fact a catalog declares, each tagged with the layer that owns it. */
export type Facts<C extends Catalog, L extends Layer> = {
  [K in keyof C & string]: Fact<L, K, Readonly<Static<C[K]>>>;
}[keyof C & string];
export type HouseKind = keyof typeof houseCatalog;
export type HouseEmission<K extends HouseKind = HouseKind> = Extract<Facts<typeof houseCatalog, "house">, { kind: K }>;
/** A program's fact as the house sees it: carried whole, its inside unread. */
export type Foreign = Fact<"program", string, unknown>;
export type ProgramFacts<C extends Catalog> = Facts<C, "program">;
type Position = Readonly<{ seq: number; id: string; at: number }>;
export type Emission<P extends Foreign = Foreign> = HouseEmission | P;
export type Event<P extends Foreign = Foreign> = Emission<P> & Position;
export type HouseEvent<K extends HouseKind = HouseKind> = HouseEmission<K> & Position;
const origin = (by: string, cause: readonly string[], process?: string) => ({
  by,
  cause,
  ...(process ? { process } : {}),
});
export const effect = <K extends HouseKind>(
  kind: K,
  data: HouseEmission<K>["data"],
  by: string,
  cause: readonly string[] = [],
  process?: string,
) => ({ layer: "house" as const, kind, data, ...origin(by, cause, process) });
const provenance = { by: name, cause: names, process: Type.Optional(name) };
const position = { id: name, at: instant, seq: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }) };
const arms = (layer: Layer, catalog: Catalog, fields: Readonly<Record<string, TSchema>>) =>
  Object.entries(catalog).map(([kind, data]) =>
    object({ ...fields, layer: Type.Literal(layer), kind: Type.Literal(kind), data }),
  );
const freeze = (value: unknown): void => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.freeze(value);
  Object.values(value).forEach(freeze);
};
export const layerOf = (kind: string): Layer => (Object.hasOwn(houseCatalog, kind) ? "house" : "program");
/** How a journal reads and checks its facts: the house's kinds and one program's, each in its layer. */
export type Vocabulary<P extends Foreign> = Readonly<{
  event: TSchema;
  emission: TSchema;
  read(value: unknown): Event<P>;
}>;
/** A program's kinds; none takes a name the house already writes. */
type Own<C extends Catalog> = C & Readonly<Partial<Record<HouseKind, never>>>;
export function vocabulary<C extends Catalog>(program: Own<C>) {
  const taken = Object.keys(program).filter(kind => layerOf(kind) === "house");
  if (taken.length) throw new Error(journalTexts.kindTaken(taken));
  const all = (fields: Readonly<Record<string, TSchema>>) =>
    Type.Union([...arms("house", houseCatalog, fields), ...arms("program", program, fields)]);
  const event = Type.Unsafe<Event<ProgramFacts<C>>>(all({ ...provenance, ...position }));
  return {
    event,
    emission: Type.Unsafe<Emission<ProgramFacts<C>>>(all(provenance)),
    read: (value: unknown) => {
      if (!Value.Check(event, value)) throw new Error(journalTexts.invalidEvent);
      const read = structuredClone(value);
      freeze(read);
      return read;
    },
    fact: <K extends keyof C & string>(
      kind: K,
      data: Readonly<Static<C[K]>>,
      by: string,
      cause: readonly string[] = [],
      process?: string,
    ) => ({ layer: "program" as const, kind, data, ...origin(by, cause, process) }),
  };
}
const ofKind = <E extends Readonly<{ kind: string }>, K extends string>(event: E, kind: K): event is E & { kind: K } =>
  event.kind === kind;
/** The bus as the house uses it: it writes its own facts and hears every one. */
export type HouseBus = Readonly<{
  emit<K extends HouseKind>(emission: HouseEmission & { kind: K }): HouseEvent<K>;
  on(listener: (event: Event) => void): () => void;
}>;
export class Bus<P extends Foreign = Foreign> {
  private readonly listeners = new Set<(event: Event<P>) => void>();
  private readonly queue: Event<P>[] = [];
  private delivering = false;
  private closed = false;
  private readonly append: (emission: Emission<P>) => Event<P>;
  constructor(append: (emission: Emission<P>) => Event<P>) {
    this.append = append;
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
export type Journal<P extends Foreign = Foreign> = {
  watch<S>(name: string, initial: S, reduce: (state: S, event: Event<P>) => S): () => S;
};
/** A process is an explicit one, or the emitting identity's own activity. */
export const processOf = (event: { by: string; process?: string | undefined }): string => event.process ?? event.by;
