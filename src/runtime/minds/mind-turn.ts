// Runs a mind's wake: a consciousness answers once; a journey goes on with its results until it says how it goes on.
import { Value } from "@sinclair/typebox/value";
import { mindFacts } from "../../house/minds/mind-facts.ts";
import { parseMindActor } from "../../fields/mind-actor.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import { effect, type HouseEmission } from "../../house/facts.ts";
import { continuation, validateAnswer, type AnswerFault, type MindAnswer } from "../../tools/minds/mind-answer.ts";
import { turnLimits, type TurnContext } from "../../tools/minds/mind-contract.ts";
import type { ReviewPort } from "../../tools/minds/mind-review.ts";
import { correctionNotice, invalidNotice, turnNotice, type TurnStop } from "../../texts/mind-turn.texts.ts";
import { createMindActReview } from "./mind-act-review.ts";
import { TurnConversation } from "./turn-conversation.ts";
import { applyActs } from "./turn-acts.ts";
import { consultationText, resultsText, type ActReport } from "./turn-results.ts";
import {
  createTurnCaller,
  TurnStopped,
  type ModelOutcome,
  type TurnCaller,
  type TurnOutcome,
  type TurnPorts,
  type TurnSnapshot,
  type TurnWake,
} from "./mind-ports.ts";
type Refused = Extract<Awaited<ReturnType<typeof applyActs>>, Readonly<{ code: string }>>;
class MindTurnRun {
  readonly turn: TurnContext;
  readonly caller: TurnCaller;
  readonly review: ReviewPort;
  readonly applied: string[] = [];
  private consulted = false;
  private readonly ports: TurnPorts;
  private readonly talk: TurnConversation;
  constructor(ports: TurnPorts, wake: TurnWake) {
    this.ports = ports;
    this.talk = new TurnConversation(wake.scope);
    this.turn = { ...wake, limits: turnLimits, usage: { calls: 0, corrections: 0, consultations: 0 } };
    this.caller = createTurnCaller(
      ports.model,
      this.turn,
      () => ports.read(wake.scope).active && ports.isOpen(wake.id),
    );
    this.review = createMindActReview(ports, this.turn, this.caller);
  }
  private write(emission: HouseEmission): void {
    this.ports.emit(emission);
  }
  private scene(text: string): void {
    const { id, scope, wake } = this.turn;
    this.write(effect("mind-scene", { turn: id, text }, scope.actor, wake, scope.process));
  }
  private error: string | undefined;
  private finish(reason?: TurnStop): TurnOutcome {
    this.caller.close();
    const outcome = reason ? "failed" : "done";
    const interrupted =
      reason === "uncertain" || reason === "act-uncertain" || reason === "inactive" || reason === "interrupted";
    const rejection = this.caller.rejection();
    const result: TurnOutcome = {
      outcome: interrupted ? "interrupted" : outcome,
      calls: this.caller.calls(),
      applied: [...this.applied],
      ...(reason ? { reason } : {}),
      ...(rejection ? { rejection } : {}),
      ...(reason === "internal" && this.error ? { error: this.error } : {}),
    };
    if (!this.ports.isOpen(this.turn.id)) return result;
    if (reason) this.scene(turnNotice.text(this.turn.language, { reason, ...(rejection ? { rejection } : {}) }));
    const { id, scope, wake } = this.turn;
    this.write(
      effect(
        "mind-turn-closed",
        {
          turn: id,
          outcome: result.outcome,
          calls: result.calls,
          applied: result.applied,
          ...(reason ? { reason } : {}),
        },
        scope.actor,
        wake,
        scope.process,
      ),
    );
    return result;
  }
  /** `told` replaces what the mind hears, when the correction comes with the results of acts already applied. */
  private correct(reason: string, faults?: readonly AnswerFault[], counted = false, told?: string): boolean {
    const { id, scope, wake } = this.turn;
    if (faults) this.write(effect("mind-answer-invalid", { turn: id, faults }, scope.actor, wake, scope.process));
    if (counted ? this.caller.stopped() : !this.caller.correct()) return false;
    const text = correctionNotice.text(this.turn.language, { reason });
    this.scene(text);
    this.talk.tell(told ?? (faults ? `${text}\n${JSON.stringify(faults)}` : text));
    return true;
  }
  /** The frame is built once per turn; every later call appends to the conversation and keeps its bytes. */
  private async think(): Promise<ModelOutcome> {
    const { scope } = this.turn;
    const build = () => {
      const frame = this.ports.frame(scope, this.turn);
      if ("tooLarge" in frame) throw new TurnStopped("frame-too-large", this.turn);
      return frame;
    };
    const { frame, schema, exchanges } = this.talk.next(build, this.ports.read(scope).menu);
    return this.caller.call(scope.actor, frame, schema, exchanges);
  }
  private inspect(value: unknown) {
    const snapshot = this.ports.read(this.turn.scope);
    return validateAnswer(value, {
      ...snapshot,
      scope: this.turn.scope,
      consulted: this.consulted,
      allowed: act => this.ports.allowed(this.turn.scope, act),
    });
  }
  private async consult(answer: MindAnswer): Promise<TurnStop | undefined> {
    requireMind(answer.consulta, "consulta");
    this.consulted = true;
    this.turn.usage.consultations = 1;
    const { id, scope, wake } = this.turn;
    const question = answer.consulta.question;
    this.write(
      effect(
        "mind-consultation-requested",
        { turn: id, question, acts: answer.acts },
        scope.actor,
        wake,
        scope.process,
      ),
    );
    const reviewed = await this.review.review({
      id: "consultation",
      reason: "consultation",
      scope,
      through: this.ports.read(scope).through,
      acts: answer.acts,
      question,
      turn: this.turn,
    });
    if (this.caller.stopped()) return this.caller.stopped();
    if (reviewed.outcome === "failed") return "review-failed";
    this.write(
      effect(
        "mind-consultation-answered",
        { turn: id, answer: reviewed.text, source: this.ports.supervision.supervisor ? "supervisor" : "unconfigured" },
        scope.actor,
        wake,
        scope.process,
      ),
    );
    if (reviewed.outcome === "rejected") return this.correct(reviewed.text) ? undefined : "rejected";
    this.talk.tell(consultationText(this.turn.language, reviewed.text));
    return undefined;
  }
  private async proposal(answer: MindAnswer): Promise<TurnOutcome | undefined> {
    this.scene(answer.scene);
    if (answer.consulta) {
      const stopped = await this.consult(answer);
      return stopped ? this.finish(stopped) : undefined;
    }
    // Nothing waits for the supervisor here: an act a rule marks waits for its verdict when it is applied (21/11).
    const { rulesVersion: version, menu } = this.ports.read(this.turn.scope);
    if (!this.inspect(answer).ok) return this.finish("permission");
    const run = { ports: this.ports, turn: this.turn, review: this.review };
    const done = await applyActs(run, answer, version, this.applied);
    if (typeof done === "string") return this.finish(this.ports.isOpen(this.turn.id) ? done : "inactive");
    if ("code" in done) return this.refused(done);
    if (!this.ports.isOpen(this.turn.id)) return this.finish("inactive");
    return this.goOn(answer, done.reports, menu);
  }
  /** A kit, a wait, its own plan or (for a consciousness) a tool refused one act: a correction. When the answer had
   * already applied acts, the mind hears their results with it, and that answer gives the next one its own
   * correction. */
  private refused(done: Refused): TurnOutcome | undefined {
    const faults = [{ code: done.code, path: "/acts" }];
    // A page read is no act applied: it gives no correction back.
    const applied = done.reports.some(report => report.status === "accepted" && report.page === undefined);
    if (applied) this.caller.settle();
    const told = applied ? this.results(done.reports) : undefined;
    return this.correct(done.correction, faults, false, told)
      ? undefined
      : this.finish(done.code === "act" ? "act-failed" : "invalid");
  }
  /** What the acts of the last answer did, the house clock and how the menu changed since that answer was asked. */
  private results(reports: readonly ActReport[]): string {
    const now = this.ports.read(this.turn.scope);
    const menus = { before: this.talk.menu(), after: now.menu };
    const { scope } = this.turn;
    return resultsText(this.turn.language, reports, now.now, menus, scope.kind === "journey", scope.process);
  }
  /** A consciousness answers once. A journey's turn closes only when its last act, applied, says how it goes on;
   * otherwise the mind hears what its acts did and answers again, bounded only by the twelve calls. */
  private goOn(answer: MindAnswer, reports: readonly ActReport[], menu: TurnSnapshot["menu"]): TurnOutcome | undefined {
    const last = answer.acts.at(-1);
    const closes = !!last && continuation(menu.find(item => item.act === last.act && item.target === last.target));
    // A consciousness whose answer reads hears what it read, and what its other acts did, and answers again.
    const reads = reports.some(report => report.page !== undefined);
    if (this.turn.scope.kind !== "journey" && !reads) return this.finish();
    if (closes && reports.at(-1)?.status === "accepted") return this.finish();
    this.talk.tell(this.results(reports));
    return undefined;
  }
  private async step(): Promise<TurnOutcome | undefined> {
    const outcome = await this.think();
    if (!this.ports.read(this.turn.scope).active || !this.ports.isOpen(this.turn.id)) return this.finish("inactive");
    if (outcome.kind === "not-sent" || outcome.kind === "failed") return this.finish(outcome.reason);
    if (outcome.kind === "uncertain") return this.finish("uncertain");
    if (outcome.kind === "invalid") {
      const faults = [{ code: outcome.reason, path: "/" }];
      return this.correct(invalidNotice.text(this.turn.language, { reason: outcome.reason }), faults, true)
        ? undefined
        : this.finish("invalid");
    }
    this.talk.answered(outcome.value);
    const value = this.ports.resolve ? this.ports.resolve(this.turn.scope, outcome.value) : outcome.value;
    const checked = this.inspect(value);
    const reason =
      checked.ok || !checked.faults.some(fault => fault.code === "continuation") ? "schema" : "continuation";
    if (!checked.ok)
      return this.correct(invalidNotice.text(this.turn.language, { reason }), checked.faults)
        ? undefined
        : this.finish("invalid");
    return this.proposal(checked.answer);
  }
  async run(): Promise<TurnOutcome> {
    const { id, scope, wake } = this.turn;
    this.write(effect("mind-turn-opened", { turn: id, wake }, scope.actor, wake, scope.process));
    try {
      for (;;) {
        const result = await this.step();
        if (result) return result;
      }
    } catch (error) {
      if (error instanceof TurnStopped) return this.finish(error.reason);
      this.error = internalError(error);
      return this.finish("internal");
    } finally {
      this.caller.close();
    }
  }
}
/** The error's name, message and first frames; frames name code, never data from the house. */
function internalError(error: unknown): string {
  if (!(error instanceof Error)) return String(error).slice(0, 300);
  const frames = (error.stack ?? "")
    .split("\n")
    .filter(line => line.trimStart().startsWith("at "))
    .slice(0, 4);
  return [`${error.name}: ${error.message}`.slice(0, 300), ...frames.map(line => line.trim())].join(" | ");
}
export async function runMindTurn(ports: TurnPorts, wake: TurnWake): Promise<TurnOutcome> {
  requireMind(ports, "ports");
  requireMind(wake, "wake");
  requireMind(wake.scope, "scope");
  requireMind(parseMindActor(wake.scope.actor), "scope.actor");
  for (const name of ["frame", "model", "read", "allowed", "emit", "execute", "isOpen"] as const)
    requireMind(typeof ports[name] === "function", name);
  requireMind(ports.supervision, "supervision");
  requireMind(["consciousness", "journey"].includes(wake.scope.kind), "scope.kind");
  if (wake.scope.kind === "journey") {
    requireMind(typeof wake.scope.process === "string" && wake.scope.process.trim(), "scope.process");
    requireMind(Array.isArray(wake.scope.kit), "scope.kit");
  }
  requireMind(typeof wake.id === "string" && wake.id.trim(), "id");
  requireMind(["es"].includes(wake.language), "language");
  requireMind(Array.isArray(wake.wake) && new Set(wake.wake).size === wake.wake.length, "wake.wake");
  requireMind(Value.Check(mindFacts["mind-turn-opened"], { turn: wake.id, wake: wake.wake }), "wake");
  requireMind(Number.isSafeInteger(wake.through) && wake.through >= 0, "through");
  return new MindTurnRun(ports, wake).run();
}
