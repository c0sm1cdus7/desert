import { describe, expect, it } from "vitest";
import { collect, flush, spyDoor, spyHouse } from "../../../tests/support/screen-spy.ts";
import { catalog, drawn, size } from "../../../tests/support/terminal-drawn.ts";
import { composed } from "../../checks/promises/cases/promised.ts";
import { conformance } from "../../checks/renderer-conformance.ts";
import { asked } from "../../surface/bridge/questions/asking-parts.ts";
import type { Intent, Screen } from "../../surface/contract/contract.ts";
import type { Result } from "../../surface/contract/shown-tool.ts";
import { addresses } from "../../texts/addressing.ts";
import { doorTexts } from "../../texts/doors.texts.ts";
import { genericTexts } from "../../texts/generic-surface.texts.ts";
import { screenDoorTexts as words } from "../../texts/screen-door.texts.ts";
import { surfaceTexts } from "../../texts/surface.texts.ts";
import { worded } from "../../tools/act-words.ts";
import { paint } from "../terminal/paint.ts";
import { entryHouse, entryRouter } from "./entry-router.ts";

const code = "ABCD-2345";
const redeem = (given: string): Promise<Result> =>
  Promise.resolve(given === code ? { ok: true, text: "" } : { ok: false, reason: doorTexts.denied });
const source = { redeem, bar: () => ({ state: "connected", clock: "10:00", now: 0 }) as const, defect: () => "" };
const plain = (screen: Screen): string =>
  screen.body.kind === "thread"
    ? screen.body.events.map(event => event.text.map(span => span.text).join("")).join("\n")
    : "";
/** A new entry router walked by these intents, each landed before the next: its screen then. */
async function after(intents: readonly Intent[]): Promise<Screen> {
  const router = entryRouter(source);
  try {
    for (const intent of intents) {
      router.send(intent);
      await router.idle();
    }
    return router.screen({ rows: 26 });
  } finally {
    router.stop();
  }
}
const typed = (text: string): readonly Intent[] => Array.from(text, char => ({ kind: "type", text: char }));
const tries: readonly Intent[] = [
  ...typed("A2-!x "),
  { kind: "erase" },
  { kind: "confirm" },
  { kind: "cancel" },
  { kind: "paste", text: code },
  { kind: "paste", text: "ZZZZ-9999" },
  { kind: "up" },
  { kind: "down" },
  { kind: "switch" },
  { kind: "menu" },
];
describe("the entry router: signing in is a screen", () => {
  it("opens on the question, not on a menu, with the Barra disconnected", async () => {
    const first = await after([]);
    expect([first.title, first.state, first.body.kind, first.menu]).toEqual([
      words.tool,
      "disconnected",
      "thread",
      false,
    ]);
    expect(plain(first)).toContain(words.ask);
    expect(first.hints.map(hint => hint.intent)).not.toContain("confirm");
    const written = await after([{ kind: "paste", text: code }]);
    expect(written.hints.find(hint => hint.intent === "confirm")?.does).toBe(words.verb);
  });
  it("ignores a character the invitation does not take, and says why", async () => {
    const screen = await after(typed("A!"));
    expect(screen.body.kind === "thread" && screen.body.entry?.typed).toBe("A");
    expect(plain(screen)).toContain(genericTexts.ignored.character);
  });
  it("keeps a refused code on the question, with the error and what was written", async () => {
    const screen = await after([{ kind: "paste", text: "ZZZZ-9999" }, { kind: "confirm" }]);
    expect(screen.body.kind === "thread" && screen.body.entry?.typed).toBe("ZZZZ-9999");
    expect(plain(screen)).toContain(doorTexts.denied);
  });
  it("ends an accepted code in Listo, and its house says it was admitted", async () => {
    const screen = await after([{ kind: "paste", text: code }, { kind: "confirm" }]);
    expect(plain(screen)).toContain(`${surfaceTexts.ok} ${words.done}`);
    const house = entryHouse(source);
    try {
      expect([house.ended(), house.failure(), house.admitted?.()]).toEqual([false, undefined, false]);
      house.router.send({ kind: "paste", text: code });
      house.router.send({ kind: "confirm" });
      await house.router.idle();
      expect([house.ended(), house.admitted?.()]).toEqual([false, true]);
    } finally {
      house.close();
    }
  });
  it("passes the conformance kit on every screen of its walk, painted by the terminal", async () => {
    const seen = new Map<string, readonly Intent[]>();
    const queue: (readonly Intent[])[] = [[]];
    for (let path = queue.shift(); path !== undefined && seen.size < 80; path = queue.shift()) {
      const screen = await after(path);
      const key = JSON.stringify(screen);
      if (seen.has(key) || path.length > 4) continue;
      seen.set(key, path);
      const failures = conformance(screen, drawn(screen, paint(screen, size)), catalog);
      expect([path, failures]).toEqual([path, []]);
      for (const intent of tries) queue.push([...path, intent]);
    }
    expect(seen.size).toBeGreaterThan(10);
  });
  it("words itself as the base words everything: no address, a question as a noun, a result as done", () => {
    const all = Object.values(words);
    expect(all.filter(text => addresses(text))).toEqual([]);
    expect(() => asked(words.ask)).not.toThrow();
    expect(() => worded({ name: words.verb, enter: words.verb })).not.toThrow();
    expect(composed.test(words.done)).toBe(true);
  });
  it("hands the session to the house once a code is accepted: the host is asked again, in a new epoch", async () => {
    const houses = [entryHouse(source), spyHouse().house];
    const { door, opens } = spyDoor(() => Promise.resolve(houses[opens.length - 1] ?? spyHouse().house));
    const first = await door.look("s", "h", { visible: true, viewport: { rows: 26 } });
    const stream = collect(door.stream("s", "h", first.client, new AbortController().signal));
    const intents = [{ kind: "paste", text: code }, { kind: "confirm" }];
    await door.send("s", "h", { epoch: first.epoch, client: first.client, seq: 1, rev: first.rev, intents });
    await houses[0]?.router.idle();
    await flush();
    const pushed = stream.got.filter(item => typeof item === "object");
    expect([opens.length, door.alive(), pushed.at(-1)?.epoch === first.epoch]).toEqual([2, 1, false]);
    expect(pushed.at(-1)?.screen.title).toBe("Prueba");
    door.close("s");
  });
});
