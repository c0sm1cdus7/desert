// The golden screens are the walk as it is today, regenerated and compared; and they show every shape a renderer meets.
import { existsSync, readFileSync } from "node:fs";
import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";
import type { HintKey } from "../../src/surface/contract/contract.ts";
import { hintSends } from "../../src/surface/contract/hint-sends.ts";
import { WireScreen, type WireScreen as Wired } from "../../src/surface/contract/wire.ts";
import { wireScreens, wireScreensPath } from "../support/wire-screens.ts";

const written = existsSync(wireScreensPath) ? readFileSync(wireScreensPath, "utf8") : "";
const parsed: unknown = written ? JSON.parse(written) : undefined;
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const entries: readonly unknown[] = isRecord(parsed) && Array.isArray(parsed.screens) ? parsed.screens : [];
const screens: readonly Wired[] = entries.flatMap(entry =>
  isRecord(entry) && Value.Check(WireScreen, entry.screen) ? [entry.screen] : [],
);
type Thread = Extract<Wired["body"], { kind: "thread" }>;
const rowsOf = ({ body }: Wired) => {
  if (body.kind === "list") return body.stacks.flatMap(stack => stack.rows);
  return body.kind === "thread" ? (body.options ?? []) : [];
};
const stacksOf = ({ body }: Wired) => (body.kind === "list" ? body.stacks : []);
const threadOf = ({ body }: Wired): Thread | undefined => (body.kind === "thread" ? body : undefined);
const eventsOf = (screen: Wired) => threadOf(screen)?.events ?? [];
const hintKeys = Object.keys(hintSends).filter((key): key is HintKey => key in hintSends);
/** What a renderer has to have met in the golden screens, each named. */
const shapes: Readonly<Record<string, (screen: Wired) => boolean>> = {
  ...Object.fromEntries(
    hintKeys.map(key => [`hint ${key}`, (screen: Wired) => screen.hints.some(hint => hint.intent === key)]),
  ),
  "body list": screen => screen.body.kind === "list",
  "body thread": screen => screen.body.kind === "thread",
  "row with key": screen => rowsOf(screen).some(row => row.key !== undefined),
  "row off": screen => rowsOf(screen).some(row => row.off === true),
  "row still": screen => rowsOf(screen).some(row => row.still === true),
  "row selected": screen => rowsOf(screen).some(row => row.selected === true),
  "row with entry": screen => rowsOf(screen).some(row => row.entry !== undefined),
  "stack empty": screen => stacksOf(screen).some(stack => stack.empty !== undefined && stack.rows.length === 0),
  "stack reads": screen => stacksOf(screen).some(stack => stack.reads === true),
  "stack below": screen => stacksOf(screen).some(stack => (stack.below ?? 0) > 0),
  "thread options": screen => (threadOf(screen)?.options?.length ?? 0) > 0,
  "thread more": screen => threadOf(screen)?.more !== undefined,
  "entry placeholder": screen => (threadOf(screen)?.entry?.placeholder ?? "") !== "",
  "entry suggested": screen => threadOf(screen)?.entry?.suggested === true,
  "entry remaining": screen => (threadOf(screen)?.entry?.remaining ?? "") !== "",
  "event nested": screen => eventsOf(screen).some(event => event.nested === true),
  "event ignored": screen => eventsOf(screen).some(event => event.ignored === true),
  "event attachments": screen => eventsOf(screen).some(event => (event.attachments?.length ?? 0) > 0),
  "panel focused": screen => screen.panel?.focused === true,
  "panel full": screen => screen.panel?.full === true,
  "menu true": screen => screen.menu,
  "menu false": screen => !screen.menu,
};

describe("the golden screens", () => {
  it("are the walk of today, wired, as the script writes them", async () => {
    expect(written, "pnpm screens").toBe(await wireScreens());
  });
  it("hold only screens of the closed shape", () => {
    expect(screens.length).toBeGreaterThan(50);
    expect(screens.length).toBe(entries.length);
  });
  it("show every shape a renderer has to draw, and name what is missing", () => {
    const missing = Object.entries(shapes).filter(([, seen]) => !screens.some(seen));
    expect(missing.map(([name]) => name)).toEqual([]);
  });
});
