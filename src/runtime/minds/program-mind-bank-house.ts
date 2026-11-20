// Isolates bank scenes while using the house engine for actions and directed messages.
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Value } from "@sinclair/typebox/value";
import { Redactor } from "../../keychain/redact.ts";
import { explicitKit, kitLayout } from "../../house/kit-selection.ts";
import { Bus } from "../../journal/bus.ts";
import type { Emission, Event } from "../../journal/vocabulary.ts";
import { readonlyState } from "../../journal/readonly-state.ts";
import { startState, toolsStep } from "../../house/state.ts";
import { createHouse } from "../../house/members.ts";
import { effect } from "../../house/facts.ts";
import { startTools } from "../../tools/start.ts";
import type { Execution } from "../../tools/execution-contract.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { Composition } from "../../tools/promises-contract.ts";
import type { MindDefinition } from "../../tools/minds/mind-contract.ts";
import type { ProgramMindScene } from "../../tools/minds/program-mind-cases.ts";
import type { Card } from "../../adapters/models/catalog.ts";
import type { TurnStop } from "../../texts/mind-turn.texts.ts";
import type { TurnOutcome } from "./mind-ports.ts";
import type { MindBilling } from "./mind-runtime-options.ts";
export class ProgramMindBankHouse {
  readonly home: string;
  readonly time = { now: () => 0, wait: () => () => {} };
  readonly program: Composition<Program>;
  readonly billing: MindBilling;
  readonly secrets: Redactor<Program>;
  readonly bus: Bus;
  readonly execution: Execution<Program>;
  private readonly tools: ReturnType<typeof startTools<Program>>;
  private state: ReturnType<typeof startState<Program>>;
  private events: Event[] = [];
  private live = true;
  private readonly outcomes: TurnOutcome[] = [];
  observeTurn = (outcome: TurnOutcome) => {
    this.outcomes.push(outcome);
  };
  constructor(program: Composition<Program>, billing: MindBilling) {
    this.program = program;
    this.billing = billing;
    this.state = startState(program.slices, "bank", true, program.registry);
    this.secrets = new Redactor(program.words.event, () => {
      throw new Error("bank.secret");
    });
    this.bus = new Bus(this.append, this.transaction);
    this.execution = this.ports();
    this.tools = startTools({ ...this.execution, history: [] });
    this.home = mkdtempSync(join(tmpdir(), "desert-mind-bank-"));
  }
  active = () => this.live && this.billing.active();
  history = () => this.events;
  failed = () => {
    this.live = false;
  };
  private append = (raw: Emission): Event => {
    const emission = this.secrets.write(raw);
    if (!Value.Check(this.program.words.emission, emission)) throw new Error("bank.emission");
    const event = { ...emission, id: randomUUID(), seq: this.events.length + 1, at: 0 };
    this.state = toolsStep(this.state, event, this.program.slices);
    this.events.push(event);
    if (this.events.filter(e => e.kind === "mind-turn-opened").length > 36) this.failed();
    return event;
  };
  private transaction = <T>(write: () => T): T => {
    const before = this.state;
    const length = this.events.length;
    try {
      return write();
    } catch (error) {
      this.state = before;
      this.events = this.events.slice(0, length);
      throw error;
    }
  };
  private ports(): Execution<Program> {
    const { registry, slices } = this.program;
    const state = () => readonlyState(this.state);
    const contracts = this.program.contractSetup?.({
      state,
      registry,
      slices,
      initial: this.state,
      events: this.history,
    });
    return {
      bus: this.bus,
      registry,
      state,
      own: () => [],
      now: this.time.now,
      live: this.active,
      process: (id, by) => {
        const journey = this.state.house.journeys.get(id);
        return !!journey && !journey.closed && journey.by === by;
      },
      // The bank receives no custody or adapters from the requesting house.
      secrets: this.secrets,
      ...(contracts ? { contracts } : {}),
    };
  }
  prepare(definition: MindDefinition, card: Card, scene: ProgramMindScene) {
    const { registry } = this.program;
    createHouse(this.bus, { admin: "bank", assignments: [{ identity: "bank", tools: registry.map(tool => tool.id) }] });
    scene.given.forEach(event => this.bus.emit(event));
    this.bus.emit(
      effect(
        "kit-set",
        {
          version: 2,
          holder: definition.actor,
          kit: explicitKit(scene.kit, kitLayout(registry)),
        },
        "bank",
      ),
    );
    this.bus.emit(
      effect(
        "mind-card-assigned",
        {
          mind: definition.actor,
          card: card.model,
          version: card.effort,
          capabilities: [...card.capabilities],
        },
        "bank",
      ),
    );
  }
  async wake(scene: ProgramMindScene) {
    const wake = scene.when;
    this.bus.emit(effect("attended", { target: wake.target }, "bank"));
    const result = this.tools.act(wake, this.state.through, "bank");
    const done = result.status === "processing" ? await result.completion : result;
    if (done.status !== "accepted") throw new Error(`bank.wake:${done.reason}`);
  }
  result(scene: ProgramMindScene) {
    const transient: readonly TurnStop[] = [
      "no-key",
      "cap",
      "http",
      "uncertain",
      "internal",
      "inactive",
      "interrupted",
    ];
    const outcome = this.outcomes.find(outcome => outcome.reason && transient.includes(outcome.reason));
    const reason = outcome?.reason;
    if (!this.active()) return { passed: false, stopped: "interrupted" as const };
    if (reason) return { passed: false, stopped: reason, rejection: outcome.rejection };
    const turns = [...this.state.house.minds.turns.values()];
    return {
      passed:
        turns.length > 0 &&
        turns.every(turn => turn.closed?.data.outcome === "done") &&
        scene.check(readonlyState(this.events)),
    };
  }
  close() {
    this.live = false;
    this.tools.stop();
    this.bus.close();
    rmSync(this.home, { recursive: true, force: true });
  }
}
