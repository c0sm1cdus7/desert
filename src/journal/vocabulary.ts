// One journal for the house's facts and a program's: the house reads its own and carries the program's unread.
import { wholeNumber } from "../fields/json-values.ts";
import { stateResult, type DeepReadonly } from "./readonly-state.ts";
import { Type, TypeGuard, type Static, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { object, visibleText } from "../fields/visible-text.ts";
import { journalTexts } from "../texts/journal.texts.ts";
import {
  name,
  type HouseEmission,
  names,
  legacyHouseCatalog,
  type HouseKind,
  layerOf,
  houseCatalog,
  mindHouseCatalog,
  origin,
  type HouseEvent,
} from "../house/facts.ts";

export type Catalog = Readonly<Record<string, TSchema>>;
export type Layer = "house" | "program";
type Provenance = Readonly<{ by: string; cause: readonly string[]; process?: string | undefined }>;
type Fact<L extends Layer, K extends string, D> = Provenance & Readonly<{ layer: L; kind: K; data: D }>;
/** Every fact a catalog declares, each tagged with the layer that owns it. */
export type Facts<C extends Catalog, L extends Layer> = {
  [K in keyof C & string]: Fact<L, K, DeepReadonly<Static<C[K]>>>;
}[keyof C & string];
/** A program's fact as the house sees it: carried whole, its inside unread. */
export type Foreign = Fact<"program", string, unknown>;
export type ProgramFacts<C extends Catalog> = Facts<C, "program">;
export type Position = Readonly<{ seq: number; id: string; at: number }>;
export type Emission<P extends Foreign = Foreign> = HouseEmission | P;
export type Event<P extends Foreign = Foreign> = Emission<P> & Position;
const provenance = { by: name, cause: names, process: Type.Optional(name) };
const position = { id: name, at: wholeNumber, seq: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }) };
const arms = (layer: Layer, catalog: Catalog, fields: Readonly<Record<string, TSchema>>) =>
  Object.entries(catalog).map(([kind, data]) =>
    object({ ...fields, layer: Type.Literal(layer), kind: Type.Literal(kind), data }),
  );
const legacyArms = arms("house", legacyHouseCatalog, {});
// New house contracts do not make every existing program fact traverse their validation branches first.
const previousHouseCatalog = Object.fromEntries(
  Object.entries(houseCatalog).filter(([kind]) => !Object.hasOwn(mindHouseCatalog, kind)),
);
// Free-text fields used \S before the visible-text rule; keep that rule for stored program facts.
const historical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(historical);
  if (!value || typeof value !== "object") return value;
  const copy = Object.fromEntries(Object.entries(value).map(([key, each]) => [key, historical(each)]));
  for (const symbol of Object.getOwnPropertySymbols(value)) Reflect.set(copy, symbol, Reflect.get(value, symbol));
  if (copy.plain === true && copy.pattern === visibleText) copy.pattern = "\\S";
  return copy;
};
const historicalSchema = (schema: TSchema): TSchema => {
  const result = historical(schema);
  if (!TypeGuard.IsSchema(result)) throw new Error("Invalid historical schema");
  return result;
};
/** Freeze an object and its enumerable values recursively, stopping at already frozen objects. */
export const deepFreeze = (value: unknown): void => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
};
/** How a journal reads and checks its facts: the house's kinds and one program's, each in its layer. */
export type Vocabulary<P extends Foreign> = Readonly<{
  event: TSchema;
  emission: TSchema;
  read(value: unknown): Event<P>;
}>;
const currentSchema = (program: Catalog, fields: Readonly<Record<string, TSchema>>) =>
  Type.Union([
    ...arms("house", previousHouseCatalog, fields),
    ...arms("program", program, fields),
    ...arms("house", mindHouseCatalog, fields),
  ]);

/** A program's kinds; none takes a name the house already writes. */
type Own<C extends Catalog> = C & Readonly<Partial<Record<HouseKind, never>>>;
export function vocabulary<C extends Catalog>(program: Own<C>) {
  const taken = Object.keys(program).filter(kind => layerOf(kind) === "house");
  if (taken.length) throw new Error(journalTexts.kindTaken(taken));
  // What earlier versions wrote is read as written: house kinds from before shared reading, program free text under \S.
  const stored = { ...provenance, ...position };
  const historicalProgram = Object.fromEntries(
    Object.entries(program).map(([kind, schema]) => [kind, historicalSchema(schema)]),
  );
  const event = Type.Unsafe<Event<ProgramFacts<C>>>(
    Type.Union([
      ...arms("house", previousHouseCatalog, stored),
      ...arms("program", historicalProgram, stored),
      ...legacyArms.map(arm => Type.Composite([arm, object(stored)])),
      ...arms("house", mindHouseCatalog, stored),
    ]),
  );
  return {
    event,
    emission: Type.Unsafe<Emission<ProgramFacts<C>>>(currentSchema(program, provenance)),
    read: (value: unknown) => {
      if (!Value.Check(event, value)) throw new Error(journalTexts.invalidEvent);
      const read = structuredClone(stateResult(value));
      deepFreeze(read);
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
/** The bus as the house uses it: it writes its own facts and hears every one. */
export type HouseBus = Readonly<{
  emit<K extends HouseKind>(emission: HouseEmission & { kind: K }): HouseEvent<K>;
  on(listener: (event: Event) => void): () => void;
  onRollback?(restore: () => void): void;
}>;
export type Journal<P extends Foreign = Foreign> = {
  watch<S>(name: string, initial: S, reduce: (state: S, event: Event<P>) => S): () => S;
};
/** A process is an explicit one, or the emitting identity's own activity. */
export const processOf = (event: { by: string; process?: string | undefined }): string => event.process ?? event.by;
