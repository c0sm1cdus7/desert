// Keeps one turn's conversation: its frame built once, then each answer and what the house told the mind back.
import { requireMind } from "../../fields/mind-errors.ts";
import { answerSchema, type MindMenu } from "../../tools/minds/mind-answer.ts";
import type { MindScope } from "../../tools/minds/mind-contract.ts";
import { journeyInputs } from "../../tools/minds/journey-menu.ts";
import type { MindFrame, TurnExchange } from "./mind-ports.ts";
type Item = MindMenu[number];
const same = (a: Item, b: Item) => a.act === b.act && a.target === b.target;
const shape = (item: Item) => JSON.stringify([item.input, item.destinations ?? null]);
/** Every control a journey can gain within its turn: a plan that brings its steps, a pending act that finishes. */
const journeyControls = (process: string): MindMenu =>
  (["plan", "done", "wait", "end", "desist"] as const).map(act => ({
    tool: "journey",
    act,
    target: process,
    input: journeyInputs[act],
    scope: "control" as const,
  }));
/** Changing the answer schema within a conversation invalidates the provider's cache of it, so a turn asks every
 * call with one schema: every act its menus offered, and for a journey every control it can gain. An act that left
 * the menu stays askable; the house checks each answer against the menu as it is now. */
function widened(asking: readonly Item[], menu: MindMenu): readonly Item[] {
  const next = [...asking];
  for (const item of menu) {
    const index = next.findIndex(each => same(each, item));
    if (index < 0) next.push(item);
    else if (shape(next[index] ?? item) !== shape(item)) next[index] = item;
  }
  return next;
}
export class TurnConversation {
  private frame: MindFrame | undefined;
  private readonly exchanges: TurnExchange[] = [];
  private asked: Record<string, unknown> | undefined;
  private answer: string | undefined;
  private shown: MindMenu = [];
  private asking: readonly Item[] = [];
  private schema: Record<string, unknown> | undefined;
  /** A journey caches its conversation from the first call, since it goes on; a consciousness only once it does. */
  private readonly cached: boolean;
  private readonly controls: MindMenu;
  constructor(scope: MindScope) {
    this.cached = scope.kind === "journey";
    this.controls = scope.kind === "journey" ? journeyControls(scope.process) : [];
  }
  /** The next call: the first frame unchanged, every exchange so far, and the turn's schema, widened only when the
   * menu offers an act it could not ask for. */
  next(build: () => MindFrame, menu: MindMenu) {
    this.frame ??= build();
    const asking = widened(this.schema ? this.asking : this.controls, menu);
    const changed = asking.length !== this.asking.length || asking.some((item, index) => item !== this.asking[index]);
    const schema = !this.schema || changed ? answerSchema(asking) : this.schema;
    this.schema = schema;
    this.asking = asking;
    this.asked = schema;
    this.answer = undefined;
    this.shown = menu;
    const exchanges = this.cached || this.exchanges.length ? { exchanges: [...this.exchanges] } : {};
    return { frame: this.frame, schema, ...exchanges };
  }
  /** The menu the last call was asked with, so the mind can be told what changed in it. */
  menu(): MindMenu {
    return this.shown;
  }
  answered(value: unknown): void {
    this.answer = JSON.stringify(value);
  }
  /** What the house tells the mind about its last answer, or about a reply that could not be read. */
  tell(text: string): void {
    requireMind(this.asked, "turn.asked");
    this.exchanges.push({
      asked: this.asked,
      ...(this.answer === undefined ? {} : { answer: this.answer }),
      told: text,
    });
    this.asked = undefined;
  }
}
