// What is pasted is a text: written where something is being written, and nowhere a key.
import { describe, expect, it } from "vitest";
import { rulesTool, seed } from "../../../tests/support/surface-rules.ts";
import { textOf } from "../../doors/terminal/cells.ts";
import { keysOf } from "../../doors/terminal/input.ts";
import { contentRows, paint } from "../../doors/terminal/paint.ts";
import { resolve } from "../router/resolve.ts";
import { actOf, start, type Session } from "./screen.ts";
import type { Tool } from "../contract/shown-tool.ts";
import { finished, step } from "../router/step.ts";

const bar = { state: "connected", clock: "14:32", battery: "71%", now: 5_000 } as const;
const size = { cols: 106, rows: 30 };
const shown = (session: Session, tools: readonly Tool[]): readonly string[] =>
  textOf(paint(resolve(session, tools, bar, { rows: contentRows(size.rows) }), size));
async function press(session: Session, keys: string, tools: readonly Tool[]): Promise<Session> {
  let now = session;
  for (const key of keysOf(keys)) {
    const stepped = step(now, key, tools, bar.now);
    now = stepped.session;
    if (stepped.run) now = finished(now, stepped.run, await actOf(tools, stepped.run).run(stepped.run.answers));
  }
  return now;
}
const paste = (text: string): string => `\x1b[200~${text}\x1b[201~`;

describe("what is pasted", () => {
  it("is written in a question that takes a text, its line breaks as spaces, and confirms nothing", async () => {
    const rules = seed();
    const tools = [rulesTool(rules)];
    const before = rules.length;
    const asking = await press(await press(start, "\r", tools), "n", tools);
    const written = await press(asking, paste("Hablar\r\nclaro\n"), tools);
    expect(shown(written, tools)[26]).toContain("› Hablar claro");
    expect(shown(written, tools).at(-1)).toContain("enter crear");
    expect(rules).toHaveLength(before);
    await press(written, "\r", tools);
    expect(rules.at(-1)?.text).toBe("Hablar claro");
  });
  it("does nothing on a menu: no row opens and no letter is a shortcut", async () => {
    const tools = [rulesTool(seed())];
    const list = await press(start, "\r", tools);
    for (const text of ["n", "1", "\r", "n\r"]) expect(await press(list, paste(text), tools)).toEqual(list);
  });
  it("does nothing where the answer is chosen: an irreversible act is not confirmed by it", async () => {
    const rules = seed();
    const tools = [rulesTool(rules)];
    const before = rules.length;
    const asking = await press(await press(await press(start, "\r", tools), "\r", tools), "l", tools);
    for (const text of ["\r", "e", "\x1b[B\r"]) expect(await press(asking, paste(text), tools)).toEqual(asking);
    expect(rules).toHaveLength(before);
  });
});
