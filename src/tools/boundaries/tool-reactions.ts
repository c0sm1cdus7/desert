// Runs confirmed notices as acts of their mind and recovers pending ones by reaction and notice.
import { meant, type Text } from "../../fields/phrases.ts";
import { OutsideDefect } from "../../fields/program-call.ts";
import { houseCatalog } from "../../house/facts.ts";
import { mindOf } from "../../house/kit.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { execute, type Execution } from "../execute.ts";
import { defectReporter } from "../failures/defect-reporter.ts";
import type { Program } from "../tool-contract.ts";

type Pending = Readonly<{ reaction: string; notice: string; by: string; reason: Text }>;
type Reaction = Readonly<{ id: string; tool: string; target: string; when: string; act: string }>;
const keyOf = (reaction: string, notice: string) => JSON.stringify([reaction, notice]);
export function declaredReactions<X extends Program>(ports: Pick<Execution<X>, "registry">): readonly Reaction[] {
  return ports.registry.flatMap(tool =>
    Object.entries(tool.reactions ?? {}).map(([id, reaction]) => {
      const action = tool.acts[reaction.act];
      const known =
        Object.hasOwn(houseCatalog, reaction.when) || ports.registry.some(tool => tool.facts?.includes(reaction.when));
      if (!action || !Object.hasOwn(tool.acts, reaction.act) || action.reach !== "house" || !known)
        throw new OutsideDefect(new Error(meant(toolTexts.invalidReaction(tool.id, reaction.act))));
      return {
        id: JSON.stringify([tool.id, id]),
        tool: tool.id,
        target: "folder" in action && typeof action.folder === "string" ? action.folder : tool.id,
        when: reaction.when,
        act: reaction.act,
      };
    }),
  );
}
function receipts(events: readonly Event[]) {
  const attempts = new Map<string, string>();
  const completed = new Set<string>();
  const reasons = new Map<string, Text>();
  for (const event of events) {
    if (event.layer !== "house") continue;
    if (event.kind === "act" && event.data.reaction) {
      const { id, notice } = event.data.reaction;
      attempts.set(event.id, keyOf(id, notice));
    }
    if (event.kind === "act-result") {
      const key = attempts.get(event.data.act);
      if (key === undefined) continue;
      if (event.data.status === "accepted") completed.add(key);
      else reasons.set(key, event.data.reason);
    }
  }
  return { completed, reasons };
}
class ReactionRunner<X extends Program> {
  private readonly ports: Execution<X>;
  private readonly declarations: readonly Reaction[];
  private readonly events: Event<X["fact"]>[] = [];
  private attempted = new Set<string>();
  private stopped = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private work: Promise<void> | undefined;
  private again = false;
  private readonly unlisten: () => void;
  constructor(ports: Execution<X>, history: readonly Event<X["fact"]>[]) {
    this.ports = ports;
    this.declarations = declaredReactions(ports);
    for (const event of history) if (this.relevant(event)) this.events.push(event);
    for (const tool of ports.registry) {
      if ("effects" in tool)
        this.report(new OutsideDefect(new Error(meant(toolTexts.legacyReactions))), tool.id, "effects");
    }
    this.unlisten = ports.bus.on(event => this.hear(event));
    if (this.pendingWork().length) this.schedule();
  }
  private report(error: unknown, tool: string, act: string) {
    const { ports } = this;
    return defectReporter(
      ports.registry,
      mindOf(tool),
      entry => ports.bus.emit(entry),
      value => ports.secrets.scrub(value),
    )(error, tool, tool, act);
  }
  private pendingWork() {
    const { completed, reasons } = receipts(this.events);
    const seen = new Set<string>();
    return this.events.flatMap(event =>
      this.declarations
        .filter(reaction => reaction.when === event.kind)
        .flatMap(reaction => {
          const key = keyOf(reaction.id, event.id);
          if (completed.has(key) || seen.has(key)) return [];
          seen.add(key);
          return [{ event, reaction, reason: reasons.get(key) ?? toolTexts.interrupted }];
        }),
    );
  }
  private async drain() {
    const { ports } = this;
    for (const { event, reaction } of this.pendingWork()) {
      if (this.stopped || !ports.live()) break;
      const key = keyOf(reaction.id, event.id);
      if (this.attempted.has(key)) continue;
      this.attempted.add(key);
      try {
        const result = execute(
          ports,
          { target: reaction.target, act: reaction.act, input: event.data },
          ports.state().through,
          mindOf(reaction.tool),
          [event.id],
          { id: reaction.id, notice: event.id },
        );
        if (result.status === "processing") await result.completion;
      } catch (error) {
        this.report(error, reaction.tool, reaction.act);
      }
    }
  }
  readonly recover = (retry = true): Promise<void> => {
    if (this.work) return this.work;
    if (retry) this.attempted.clear();
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    // Defer until the source transaction has either committed or rolled back.
    this.work = Promise.resolve()
      .then(() => this.drain())
      .finally(() => {
        this.work = undefined;
        if (this.again) {
          this.again = false;
          this.schedule();
        }
      });
    return this.work;
  };
  private schedule() {
    if (this.stopped || this.timer !== undefined) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (this.work) {
        this.again = true;
        return;
      }
      void this.recover(false).catch((error: unknown) => this.report(error, "program", "reaction"));
    }, 0);
  }
  private relevant(event: Event<X["fact"]>) {
    return (
      this.declarations.some(reaction => reaction.when === event.kind) ||
      (event.layer === "house" &&
        ((event.kind === "act" && event.data.reaction !== undefined) || event.kind === "act-result"))
    );
  }
  private hear(event: Event<X["fact"]>) {
    if (this.relevant(event)) {
      const length = this.events.length;
      this.ports.bus.onRollback(() => {
        this.events.length = length;
      });
      this.events.push(event);
    }
    if (event.layer === "house" && (event.kind === "kit-set" || event.kind === "boot")) {
      const attempted = this.attempted;
      this.ports.bus.onRollback(() => {
        this.attempted = attempted;
      });
      this.attempted = new Set();
    }
    if (
      this.declarations.some(reaction => reaction.when === event.kind) ||
      (event.layer === "house" && (event.kind === "kit-set" || event.kind === "boot"))
    )
      this.schedule();
  }
  pending(): readonly Pending[] {
    return this.pendingWork().map(({ event, reaction, reason }) => ({
      reaction: reaction.id,
      notice: event.id,
      by: mindOf(reaction.tool),
      reason,
    }));
  }
  stop(): void {
    this.stopped = true;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.unlisten();
  }
}
export function startReactions<X extends Program>(ports: Execution<X>, history: readonly Event<X["fact"]>[]) {
  const runner = new ReactionRunner(ports, history);
  return { recover: runner.recover, pending: () => runner.pending(), stop: () => runner.stop() };
}
