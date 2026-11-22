// Declares the turn's ports and serializes its twelve shared physical attempts.
import type { ProviderRejection } from "../../fields/provider-rejection.ts";
import type { Usage } from "../../adapters/models/catalog.ts";
import type { MindActor } from "../../fields/mind-actor.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import type { HouseEmission } from "../../house/facts.ts";
import type { MindScope, TurnContext } from "../../tools/minds/mind-contract.ts";
import type { MindMenu, ProposedAct } from "../../tools/minds/mind-answer.ts";
import type { ReviewPort, ReviewRequest, ReviewResult } from "../../tools/minds/mind-review.ts";
import { turnNotice, type TurnStop } from "../../texts/mind-turn.texts.ts";
/** The frame: four stable layers, the own thread's sealed blocks (append-only, cached) and the tail that changes. */
export type MindFrame = Readonly<{
  layers: readonly [string, string, string, string];
  kept?: readonly string[];
  changing: string;
}>;
export type FramePort = (scope: MindScope, turn: TurnContext) => MindFrame | Readonly<{ tooLarge: true }>;
/** One exchange after the frame: the schema the answer was asked with, the answer when it could be read, and what
 * the house told the mind back. Later calls of a turn append exchanges and never rebuild the frame. */
export type TurnExchange = Readonly<{ asked: Record<string, unknown>; answer?: string; told: string }>;
export type ModelRequest = Readonly<{
  mind: MindActor;
  turn: string;
  number: number;
  frame: MindFrame;
  schema: Record<string, unknown>;
  /** Present for a turn's own conversation, which the provider caches up to its end; absent for a one-off call. */
  exchanges?: readonly TurnExchange[];
}>;
export type ModelOutcome =
  | Readonly<{ kind: "answer"; value: unknown; usage: Usage }>
  | Readonly<{ kind: "invalid"; reason: "json" | "schema" | "max_tokens" | "refusal"; usage?: Usage }>
  | Readonly<{ kind: "failed"; reason: "http" | "transport"; rejection?: ProviderRejection }>
  | Readonly<{ kind: "not-sent"; reason: "cap" | "no-key" | "no-card" | "conversation-too-large" }>
  | Readonly<{ kind: "uncertain" }>;
export type ModelPort = (request: ModelRequest) => Promise<ModelOutcome>;
export type TurnWake = Pick<TurnContext, "id" | "scope" | "language" | "wake" | "through">;
export type TurnOutcome = Readonly<{
  outcome: "done" | "failed" | "interrupted";
  calls: number;
  applied: readonly string[];
  reason?: TurnStop;
  rejection?: ProviderRejection;
  /** What broke an internal turn, with where it broke, so the host can log it: nothing fails in silence. */
  error?: string;
}>;
export type TurnCaller = Readonly<{
  call: (
    mind: MindActor,
    frame: MindFrame,
    schema: Record<string, unknown>,
    exchanges?: readonly TurnExchange[],
  ) => Promise<ModelOutcome>;
  /** The supervisor's call: it counts within the turn, but a provider that fails or a call that is not sent leaves
   * the act to the mechanical rules instead of stopping the turn; only an uncertain call stops it (signed 17/11). */
  consult: (mind: MindActor, frame: MindFrame, schema: Record<string, unknown>) => Promise<ModelOutcome>;
  stopped: () => TurnStop | undefined;
  rejection: () => ProviderRejection | undefined;
  calls: () => number;
  correct: () => boolean;
  /** A consciousness answer whose acts were applied gives the next answer its own correction. */
  settle: () => void;
  pendingInvalid: () => boolean;
  close: () => void;
}>;
export type SupervisionPorts = {
  rules?: ReviewPort;
  supervisor?: (request: ReviewRequest, caller: TurnCaller) => Promise<ReviewResult>;
};
export type TurnSnapshot = Readonly<{
  active: boolean;
  menu: MindMenu;
  through: number;
  rulesVersion: string;
  /** The house clock, told to a journey with its results so its next wait counts from now. */
  now: number;
}>;
export type TurnPorts = Readonly<{
  frame: FramePort;
  /** The whole text the read act asks for, from a character on, or nothing when there is no such text. */
  page?: (turn: Pick<TurnContext, "id" | "scope">, target: string, from: number) => string | undefined;
  /** The answer with the whole ids behind the short references the mind read and gave back. */
  resolve?: (scope: MindScope, value: unknown) => unknown;
  model: ModelPort;
  read: (scope: MindScope) => TurnSnapshot;
  isOpen: (id: string) => boolean;
  allowed: (scope: MindScope, proposal: ProposedAct) => boolean;
  supervision: SupervisionPorts;
  emit: (emission: HouseEmission) => void;
  execute: (
    proposal: ProposedAct,
    context: Readonly<{ turn: TurnContext; review: ReviewPort }>,
  ) => Promise<ExecuteResult>;
}>;
/** What an act did: its status, the reason a tool gave for refusing it, and what it returned (a device's receipt). */
export type ExecuteResult = Readonly<{
  status: "accepted" | "rejected" | "interrupted" | "inconclusive";
  id: string;
  reason?: string;
  text?: string;
  value?: unknown;
}>;
export class TurnStopped extends Error {
  readonly reason: TurnStop;
  constructor(reason: TurnStop, turn: TurnContext) {
    super(turnNotice.text(turn.language, { reason }));
    this.reason = reason;
  }
}
/** All physical calls and corrections, including the supervisor's, share this private ledger. */
class TurnCallLedger {
  count = 0;
  stop: TurnStop | undefined;
  rejection: ProviderRejection | undefined;
  closed = false;
  invalid = false;
  corrected = false;
  readonly turn: TurnContext;
  constructor(turn: TurnContext) {
    this.turn = turn;
  }
  /** A journey turn corrects as often as it needs within its twelve calls (21/11); a consciousness, once. */
  correct = (): boolean => {
    if (this.corrected && this.turn.scope.kind !== "journey") return false;
    this.corrected = true;
    this.turn.usage.corrections += 1;
    return true;
  };
  receive(outcome: ModelOutcome, soft = false): ModelOutcome {
    if (outcome.kind === "not-sent") this.count--;
    this.turn.usage.calls = this.count;
    if (soft) {
      if (outcome.kind === "uncertain") this.stop = "uncertain";
      return outcome;
    }
    if (outcome.kind === "failed" || outcome.kind === "not-sent") this.stop = outcome.reason;
    if (outcome.kind === "failed") this.rejection = outcome.rejection;
    if (outcome.kind === "uncertain") this.stop = "uncertain";
    if (outcome.kind === "invalid" && !this.correct()) this.stop = "invalid";
    this.invalid = outcome.kind === "invalid";
    return outcome;
  }
  async send(model: ModelPort, request: Omit<ModelRequest, "turn" | "number">, active: () => boolean, soft = false) {
    if (this.closed || !active()) this.stop = "inactive";
    if (this.count >= 12) this.stop ??= "call-limit";
    if (this.stop) throw new TurnStopped(this.stop, this.turn);
    this.count++;
    this.turn.usage.calls = this.count;
    try {
      return this.receive(await model({ ...request, turn: this.turn.id, number: this.count }), soft);
    } catch {
      return this.receive({ kind: "uncertain" }, soft);
    }
  }
}
export function createTurnCaller(model: ModelPort, turn: TurnContext, active: () => boolean): TurnCaller {
  requireMind(typeof model === "function", "model");
  requireMind(turn, "turn");
  requireMind(typeof active === "function", "active");
  const ledger = new TurnCallLedger(turn);
  let queue = Promise.resolve();
  const send = (request: Omit<ModelRequest, "turn" | "number">, soft: boolean) => {
    const result = queue.then(() => ledger.send(model, request, active, soft));
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
  return {
    call: (mind, frame, schema, exchanges) => send({ mind, frame, schema, ...(exchanges ? { exchanges } : {}) }, false),
    consult: (mind, frame, schema) => send({ mind, frame, schema }, true),
    calls: () => ledger.count,
    correct: ledger.correct,
    settle: () => {
      ledger.corrected = false;
    },
    pendingInvalid: () => ledger.invalid,
    stopped: () => ledger.stop,
    rejection: () => ledger.rejection,
    close: () => {
      ledger.closed = true;
    },
  };
}
