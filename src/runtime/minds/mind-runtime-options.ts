// Declares explicit model resources, optional host spending accounts and mind switches.
import type { ProviderRejection } from "../../fields/provider-rejection.ts";
import type { Card } from "../../adapters/models/catalog.ts";
import type { Language } from "../../fields/languages.ts";
import type { MindActor } from "../../fields/mind-actor.ts";
import type { HouseOptions } from "../../house/state.ts";
import type { Event } from "../../journal/vocabulary.ts";
import type { ProgramMessage } from "../../tools/installable/program.ts";
import type { TimeSource } from "../../journal/clock.ts";
import type { Execution } from "../../tools/execution-contract.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { MindDefinition } from "../../tools/minds/mind-contract.ts";
import type { FrameSource } from "./mind-frame.ts";
import type { SupervisionPorts, TurnOutcome } from "./mind-ports.ts";
import type { Composition } from "../../tools/promises-contract.ts";
import type { ProgramMindCase } from "../../tools/minds/program-mind-cases.ts";
import type { Bus } from "../../journal/bus.ts";
import type { ModelAccount, ModelCalls } from "../../house/minds/model-call-state.ts";
import type { SpendingAccount } from "./model-spending-account.ts";
export type MindBilling = Readonly<{
  bus: Pick<Bus, "emit" | "together" | "confirmation">;
  calls: () => ModelCalls;
  balance?: (account: string) => ModelAccount;
  active: () => boolean;
}>;
export type MindSwitches = Readonly<{ asistentes: boolean; programas: readonly string[] }>;
export type MindRuntimeOptions = Readonly<{
  /** Offline catalog composition only: the house never runs the bank when it opens. */
  programBank?: Readonly<{ program: Composition<Program>; cases: ReadonlyMap<string, readonly ProgramMindCase[]> }>;
  /** Starting card per mind actor, chosen by hand; the administrator can change it afterwards. */
  cards?: Readonly<Record<string, Readonly<{ model: string; effort: string }>>>;
  /** The card an enabled assistant gets when it has none; the administrator can change it afterwards. */
  assistantCard?: Readonly<{ model: string; effort: string }>;
  /** The house supervisor's card; without one the mechanical rules decide alone (signed 17/11). */
  supervisorCard?: Readonly<{ model: string; effort: string }>;
  /** The acts minds say things with: those of the programs that declare `mensajes` (signed 20/11). */
  talk?: readonly Readonly<{ tool: string; act: string }>[];
  billing?: MindBilling;
  spendingAccount?: SpendingAccount;
  providerRejections?: ReadonlyMap<string, ProviderRejection>;
  scrubProviderError?: (text: string) => string;
  observeTurn?: (outcome: TurnOutcome) => void;
  unavailable?: ReadonlyMap<string, import("../../texts/mind-turn.texts.ts").TurnStop>;
  language: Language;
  definitions: readonly MindDefinition[];
  catalog: readonly Card[];
  providers: readonly string[];
  fingerprint: (definition: MindDefinition) => Readonly<{ cases: string; skill: string; frameTexts: string }>;
  key: (card: Card) => Promise<string | undefined>;
  transport: typeof fetch;
  account: string;
  capNanoUsd: number;
  maxInputTokens: number;
  /** Reads a program fact as a message; minds talk only through programs (signed 20/11). */
  message: (event: Event) => ProgramMessage | undefined;
  textRules: FrameSource["textRules"];
  rulesVersion: () => string;
  supervision?: SupervisionPorts;
}>;
export type ModelHouseOptions<X extends Program> = HouseOptions<X> &
  Readonly<{
    mentes?: MindSwitches;
    modelMinds?: MindRuntimeOptions;
  }>;
export type MindRuntimeHouse<X extends Program> = Readonly<{
  home: string;
  execution: Execution<X>;
  history: () => readonly Event<X["fact"]>[];
  time: TimeSource;
  active: () => boolean;
  failed: (error: Error) => void;
}>;
/** A house supervises when it has a supervisor's card or the host brings its own supervisor. */
export const supervised = (options: Pick<MindRuntimeOptions, "supervisorCard" | "supervision">): boolean =>
  options.supervisorCard !== undefined || options.supervision?.supervisor !== undefined;
export const enabledMind = (switches: MindSwitches, actor: MindActor): boolean =>
  actor.startsWith("assistant:") ? switches.asistentes : switches.programas.includes(actor.slice(5));
