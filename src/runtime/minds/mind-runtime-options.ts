// Declara interruptores y recursos explícitos del pensamiento sin cargar modelos al abrir una casa apagada.
import type { Card } from "../../adapters/models/catalog.ts";
import type { Language } from "../../fields/languages.ts";
import type { MindActor } from "../../fields/mind-actor.ts";
import type { HouseOptions } from "../../house/state.ts";
import type { Event } from "../../journal/vocabulary.ts";
import type { TimeSource } from "../../journal/clock.ts";
import type { Execution } from "../../tools/execution-contract.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { MindDefinition } from "../../tools/minds/mind-contract.ts";
import type { FrameSource } from "./mind-frame.ts";
import type { SupervisionPorts } from "./mind-ports.ts";
export type MindSwitches = Readonly<{ asistentes: boolean; programas: readonly string[] }>;
export type MindRuntimeOptions = Readonly<{
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
  message: (event: Event) => Readonly<{ text: string; to?: string }> | undefined;
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
export const enabledMind = (switches: MindSwitches, actor: MindActor): boolean =>
  actor.startsWith("assistant:") ? switches.asistentes : switches.programas.includes(actor.slice(5));
