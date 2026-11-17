// Define roles, alcances y límites del turno sin exponer cartas, precios ni cuentas al modelo.
import type { MindActor } from "../../fields/mind-actor.ts";
import type { Message } from "../../fields/messages.ts";
import type { Language } from "../../fields/languages.ts";
import type { DelegatedKit } from "../../house/assistants/assistant-facts.ts";
export type MindScope =
  | Readonly<{ kind: "consciousness"; actor: MindActor; process?: never }>
  | Readonly<{ kind: "journey"; actor: MindActor; process: string; kit: DelegatedKit }>;
export type MindDefinition = Readonly<{
  role: string;
  actor: MindActor;
  rules: Message<Record<string, never>, "mind">;
  communication: readonly Readonly<{ tool: string; act: string }>[];
}>;
export type TurnLimits = Readonly<{ calls: 12; corrections: 1; consultations: 1 }>;
export const turnLimits: TurnLimits = { calls: 12, corrections: 1, consultations: 1 };
/** The same counter is shared by the mind and its supervisor; it counts physical provider attempts. */
export type TurnContext = Readonly<{
  id: string;
  scope: MindScope;
  language: Language;
  wake: readonly string[];
  through: number;
  limits: TurnLimits;
  usage: { calls: number; corrections: number; consultations: number };
}>;
