// A mark is said apart from the key: every option of a question that takes several says whether it is taken.
import { describe, expect, it } from "vitest";
import { replayed } from "../../checks/surface-walk.ts";
import { fresh, walked } from "../../../tests/support/surface-tools.ts";
import type { Intent, Row, Screen } from "../contract/contract.ts";
import { resolve } from "../router/resolve.ts";
import { fieldOf } from "../session/screen.ts";

const bar = { language: "es", state: "connected", clock: "14:32", now: 5_000 } as const;
const optionsOf = ({ body }: Screen): readonly Row[] => (body.kind === "thread" ? (body.options ?? []) : []);
const key = (text: string): Intent => ({ kind: "type", text });

describe("a mark, by hand", () => {
  it("is said on every option, beside the key, and flips with it", async () => {
    const tools = fresh();
    const asked = await replayed(tools, [key("e"), key("n")]);
    const before = optionsOf(resolve(asked, tools, bar, { rows: 52 }));
    expect(before.map(row => [row.title, row.key, row.marked])).toEqual([
      ["Pan", " ", false],
      ["Leche", " ", false],
    ]);
    const marked = await replayed(tools, [key(" ")], asked);
    const after = optionsOf(resolve(marked, tools, bar, { rows: 52 }));
    expect(after.map(row => [row.title, row.key, row.marked])).toEqual([
      ["Pan", "x", true],
      ["Leche", " ", false],
    ]);
  });
});

describe("a mark, over every golden screen", async () => {
  const stops = await walked();
  const questions = await Promise.all(
    stops.map(async ({ path, screen }) => {
      const tools = fresh();
      const place = (await replayed(tools, path)).at(-1);
      const field = place?.kind === "act" && place.phase === "asking" ? fieldOf(tools, place) : null;
      return { path, screen, many: field?.kind === "many" };
    }),
  );
  it("is on every option of a question that takes several, and equals its key", () => {
    const many = questions.filter(question => question.many);
    expect(many.length).toBeGreaterThan(0);
    for (const { screen, path } of many)
      for (const row of optionsOf(screen)) expect(row.marked, JSON.stringify(path)).toBe(row.key === "x");
  });
  it("is on no option of any other question", () => {
    const rows = questions.filter(question => !question.many).flatMap(({ screen }) => optionsOf(screen));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter(row => row.marked !== undefined)).toEqual([]);
  });
  it("is said on every option that is not off wherever the mark hint is", () => {
    const hinted = stops.filter(({ screen }) => screen.hints.some(hint => hint.intent === "mark"));
    expect(hinted.length).toBeGreaterThan(0);
    for (const { screen } of hinted)
      expect(optionsOf(screen).filter(row => !row.off && row.marked === undefined)).toEqual([]);
  });
});
