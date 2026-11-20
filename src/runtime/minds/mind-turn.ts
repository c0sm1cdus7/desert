// Ejecuta un despertar de una mente con consulta, revisión y una sola corrección compartida.
import { Value } from "@sinclair/typebox/value";
import { mindFacts } from "../../house/minds/mind-facts.ts";
import { parseMindActor } from "../../fields/mind-actor.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import { effect, type HouseEmission } from "../../house/facts.ts";
import { answerSchema, validateAnswer, type AnswerFault, type MindAnswer } from "../../tools/minds/mind-answer.ts";
import { turnLimits, type TurnContext } from "../../tools/minds/mind-contract.ts";
import type { ReviewPort } from "../../tools/minds/mind-review.ts";
import { correctionNotice, invalidNotice, turnNotice, type TurnStop } from "../../texts/mind-turn.texts.ts";
import { JourneyKitRefused, JourneyWaitRefused } from "../../tools/minds/journey-controls.ts";
import { createMindActReview, reviewMindActs } from "./mind-act-review.ts";
import {
  createTurnCaller,
  TurnStopped,
  type ModelOutcome,
  type TurnCaller,
  type TurnOutcome,
  type TurnPorts,
  type TurnWake,
} from "./mind-ports.ts";
class MindTurnRun {
  readonly turn: TurnContext;
  readonly caller: TurnCaller;
  readonly review: ReviewPort;
  readonly applied: string[] = [];
  private consulted = false;
  private readonly ports: TurnPorts;
  constructor(ports: TurnPorts, wake: TurnWake) {
    this.ports = ports;
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
        { turn: id, outcome: result.outcome, calls: result.calls, applied: result.applied },
        scope.actor,
        wake,
        scope.process,
      ),
    );
    return result;
  }
  private correct(reason: string, faults?: readonly AnswerFault[], counted = false): boolean {
    const { id, scope, wake } = this.turn;
    if (faults) this.write(effect("mind-answer-invalid", { turn: id, faults }, scope.actor, wake, scope.process));
    if (counted ? this.caller.stopped() : !this.caller.correct()) return false;
    this.scene(correctionNotice.text(this.turn.language, { reason }));
    return true;
  }
  private async think(): Promise<ModelOutcome> {
    const { scope } = this.turn;
    const frame = this.ports.frame(scope, this.turn);
    if ("tooLarge" in frame) throw new TurnStopped("frame-too-large", this.turn);
    return this.caller.call(scope.actor, frame, answerSchema(this.ports.read(scope).menu));
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
    if (reviewed.outcome === "rejected" && !this.correct(reviewed.text)) return "rejected";
    return undefined;
  }
  private async apply(
    answer: MindAnswer,
    version: string,
  ): Promise<TurnStop | Readonly<{ code: "kit" | "wait" | "act"; correction: string }> | undefined> {
    for (const act of answer.acts) {
      const current = this.ports.read(this.turn.scope);
      if (!current.active || !this.ports.isOpen(this.turn.id)) return "inactive";
      if (current.rulesVersion !== version) return "review-stale";
      if (!this.ports.allowed(this.turn.scope, act)) return "permission";
      let result: Awaited<ReturnType<typeof this.ports.execute>>;
      try {
        result = await this.ports.execute(act, { turn: this.turn, review: this.review });
      } catch (error) {
        if (error instanceof JourneyKitRefused)
          return {
            code: "kit",
            correction: `${invalidNotice.text(this.turn.language, { reason: "kit" })} ${error.kit}`,
          };
        if (error instanceof JourneyWaitRefused)
          return {
            code: "wait",
            correction: `${invalidNotice.text(this.turn.language, { reason: "wait" })} ${error.now}`,
          };
        throw error;
      }
      if (result.status === "inconclusive") return "act-uncertain";
      // A tool's refusal says why; the mind gets it back to adjust, within the turn's correction budget.
      if (result.status === "rejected" && result.reason) return { code: "act", correction: result.reason };
      if (result.status !== "accepted") return "act-failed";
      requireMind(result.id && !this.applied.includes(result.id), "act.id");
      this.applied.push(result.id);
    }
    return undefined;
  }
  private async proposal(answer: MindAnswer): Promise<TurnOutcome | undefined> {
    this.scene(answer.scene);
    if (answer.consulta) {
      const stopped = await this.consult(answer);
      return stopped ? this.finish(stopped) : undefined;
    }
    const version = this.ports.read(this.turn.scope).rulesVersion;
    const reviewed = await reviewMindActs(this.ports, this.turn, this.review, answer.acts);
    const stopped = this.caller.stopped();
    if (stopped) return this.finish(stopped);
    if (reviewed?.outcome === "failed") return this.finish("review-failed");
    if (reviewed?.outcome === "rejected") return this.correct(reviewed.text) ? undefined : this.finish("rejected");
    if (version !== this.ports.read(this.turn.scope).rulesVersion) return this.finish("review-stale");
    if (!this.inspect(answer).ok) return this.finish("permission");
    const failure = await this.apply(answer, version);
    if (typeof failure === "object")
      return this.correct(failure.correction, [{ code: failure.code, path: "/acts" }])
        ? undefined
        : this.finish(failure.code === "act" ? "act-failed" : "invalid");
    return this.finish(this.ports.isOpen(this.turn.id) ? failure : "inactive");
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
    const checked = this.inspect(outcome.value);
    if (!checked.ok)
      return this.correct(invalidNotice.text(this.turn.language, { reason: "schema" }), checked.faults)
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
  for (const name of ["frame", "model", "read", "allowed", "reviewReason", "emit", "execute", "isOpen"] as const)
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
