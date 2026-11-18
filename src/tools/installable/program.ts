// Declares an installable program with its own state, facts and named groups, independent of a distribution.
import type { TSchema } from "@sinclair/typebox";
import type { Skill } from "../../fields/messages.ts";
import { deepFreeze } from "../../journal/vocabulary.ts";
import type { ProgramFacts, Event } from "../../journal/vocabulary.ts";
import type { DeepReadonly } from "../../journal/readonly-state.ts";
import type { ProgramTool } from "../promises-contract.ts";
import type { State } from "../tool-contract.ts";
import { installProgram } from "./adapter.ts";
import type { InstalledProgram } from "./runtime.ts";
export const DESERT_CONTRACT = 1;
export type FactDefinition = Readonly<{ nombre: string; forma: TSchema }>;
export type ProgramMetadata = Readonly<{
  dependencies?: readonly Readonly<{ kind: "contract" | "distribution"; name: string }>[];
  id: string;
  version: `${number}.${number}.${number}`;
  desert: number;
  codigo: readonly [string, ...string[]];
  hechos: readonly FactDefinition[];
  inicial: () => unknown;
}>;
export type FactCatalog<M extends ProgramMetadata> = {
  [F in M["hechos"][number] as F["nombre"]]: F["forma"];
};
export type LocalProgram<M extends ProgramMetadata> = {
  fact: ProgramFacts<FactCatalog<M>>;
  tools: { own: ReturnType<M["inicial"]> };
};
import type { ProgramWords } from "../../fields/installable-words.ts";
export type { ProgramWords } from "../../fields/installable-words.ts";
export type ProgramGroup<X extends import("../tool-contract.ts").Program> = Omit<
  ProgramTool<X>,
  "id" | "facts" | "skill" | "start" | "groups"
> &
  Readonly<{ palabras: ProgramWords }>;
export type ProgramBody<M extends ProgramMetadata> = Readonly<{
  purpose: string;
  skill: Skill;
  palabras: ProgramWords;
  herramientas: Readonly<Record<string, ProgramGroup<LocalProgram<M>>>>;
  plegar: (
    own: DeepReadonly<ReturnType<M["inicial"]>>,
    event: Event<LocalProgram<M>["fact"]>,
    before: State<LocalProgram<M>>,
  ) => DeepReadonly<ReturnType<M["inicial"]>>;
  summary: (state: State<LocalProgram<M>>) => string;
  effects?: unknown;
}>;
export type InstallableProgram = ProgramMetadata &
  Readonly<{
    effects?: unknown;
    herramientas: Readonly<Record<string, Readonly<{ acts: Readonly<Record<string, unknown>>; effects?: unknown }>>>;
    install: () => InstalledProgram;
  }>;
export function programa<const M extends ProgramMetadata, const B extends ProgramBody<NoInfer<M>>>(
  metadata: M,
  body: B,
): M & B & Readonly<{ install: () => InstalledProgram }> {
  const ownMetadata = { ...metadata };
  const ownBody = { ...body };
  const definition = { ...ownMetadata, ...ownBody, install: () => installProgram(ownMetadata, ownBody) };
  deepFreeze(ownMetadata);
  deepFreeze(ownBody);
  deepFreeze(definition);
  return definition;
}
export { programAct } from "../promises.ts";
export type { Case, ProgramAct } from "../promises-contract.ts";
export { Type, type Static, type TSchema } from "@sinclair/typebox";
