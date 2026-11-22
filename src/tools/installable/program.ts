// Declares an installable program with its own state, facts and named groups, independent of a distribution.
import type { TSchema } from "@sinclair/typebox";
import type { Skill } from "../../fields/messages.ts";
import { deepFreeze } from "../../journal/vocabulary.ts";
import type { ProgramFacts, Event } from "../../journal/vocabulary.ts";
import type { DeepReadonly } from "../../journal/readonly-state.ts";
import type { ProgramTool } from "../promises-contract.ts";
import type { State } from "../tool-contract.ts";
import { installProgram } from "./adapter.ts";
import type { InstalledProgram, ProgramReadings } from "./runtime.ts";
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
import type { ProgramMindCase } from "../minds/program-mind-cases.ts";
export type { ProgramMindCase, ProgramMindScene } from "../minds/program-mind-cases.ts";
/** How a program's fact reads as a message to minds: who it is for and the line they see. */
export type ProgramMessage = Readonly<{ text: string; to: readonly string[]; by: string }>;
export type MessageReader = (event: Event) => ProgramMessage | undefined;
/** A program minds talk through: how its facts read as messages and the acts a consciousness may say them with. */
export type ProgramTalk = Readonly<{ leer: MessageReader; actos: readonly [string, ...string[]] }>;
import type { ContractPackage } from "../contracts/package-contracts.ts";
export type {
  ContractCase,
  ContractCaseStep,
  ContractOffer,
  ContractPackage,
  ContractProjector,
  ContractRequest,
} from "../contracts/package-contracts.ts";
export type { ContractAction, ContractInterface, ContractNotice, ContractObject } from "../contracts/contract-types.ts";
/** Its own half of each contract, published with it: what it offers, what it requests, and the projectors its offers
 * read. Composing checks them; a program that neither offers nor requests leaves them out. */
type ContractHalf = Partial<Pick<ContractPackage, "artifact" | "ofrece" | "pide" | "proyectores">>;
export type ProgramBody<M extends ProgramMetadata> = Readonly<{
  mindCases?: readonly ProgramMindCase[];
  mensajes?: ProgramTalk;
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
}> &
  ContractHalf;
export type InstallableProgram = ProgramMetadata &
  Readonly<{
    effects?: unknown;
    mindCases?: readonly ProgramMindCase[];
    mensajes?: ProgramTalk;
    herramientas: Readonly<Record<string, Readonly<{ acts: Readonly<Record<string, unknown>>; effects?: unknown }>>>;
    /** Installs it; composing passes what it reads from its providers, when it requests any. */
    install: (readings?: ProgramReadings) => InstalledProgram;
  }>;
export function programa<const M extends ProgramMetadata, const B extends ProgramBody<NoInfer<M>>>(
  metadata: M,
  body: B,
): M & B & Readonly<{ install: (readings?: ProgramReadings) => InstalledProgram }> {
  const ownMetadata = { ...metadata };
  const ownBody = { ...body };
  const definition = {
    ...ownMetadata,
    ...ownBody,
    install: (readings?: ProgramReadings) => installProgram(ownMetadata, ownBody, readings),
  };
  deepFreeze(ownMetadata);
  deepFreeze(ownBody);
  deepFreeze(definition);
  return definition;
}
export { programAct } from "../promises.ts";
export type { Case, ProgramAct } from "../promises-contract.ts";
export { Type, type Static, type TSchema } from "@sinclair/typebox";
