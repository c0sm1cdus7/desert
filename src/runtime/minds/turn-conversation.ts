// Keeps one turn's conversation: its frame built once, then each answer and what the house told the mind back.
import { requireMind } from "../../fields/mind-errors.ts";
import { answerSchema, type MindMenu } from "../../tools/minds/mind-answer.ts";
import type { MindFrame, TurnExchange } from "./mind-ports.ts";
export class TurnConversation {
  private frame: MindFrame | undefined;
  private readonly exchanges: TurnExchange[] = [];
  private asked: Record<string, unknown> | undefined;
  private answer: string | undefined;
  private shown: MindMenu = [];
  /** A journey caches its conversation from the first call, since it goes on; a consciousness only once it does. */
  private readonly cached: boolean;
  constructor(cached: boolean) {
    this.cached = cached;
  }
  /** The next call: the first frame unchanged, every exchange so far, and the schema of the menu as it is now. */
  next(build: () => MindFrame, menu: MindMenu) {
    this.frame ??= build();
    const schema = answerSchema(menu);
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
