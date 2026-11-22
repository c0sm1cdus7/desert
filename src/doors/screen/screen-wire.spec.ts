import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { wireScreensPath } from "../../../tests/support/wire-screens.ts";
import { socketLimits } from "../socket/wire/protocol.ts";
import { pasteLimit } from "../../surface/contract/limits.ts";
import { screenLimits } from "./screen-limits.ts";
import { parseFrame, parseLook, parseSend } from "./screen-wire.ts";

const send = { epoch: "e1", client: "c1", seq: 1, rev: 1, intents: [{ kind: "down" }] };
const look = { client: "c1", visible: true, viewport: { rows: 26 } };
const without = (value: Readonly<Record<string, unknown>>, key: string) =>
  Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
const reasonOf = (parsed: { ok: true } | { ok: false; reason: string }) => (parsed.ok ? "accepted" : parsed.reason);

describe("the screen door's wire", () => {
  it("keeps the bounds it shares with the house where the house keeps them", () => {
    expect(screenLimits.clients).toBe(socketLimits.waits);
    expect(screenLimits).toEqual({
      idleMs: 1_800_000,
      batch: 64,
      rows: 500,
      clients: 8,
      revs: 64,
      keepaliveMs: 15_000,
    });
  });
  it("accepts a batch and refuses, with its reason, each body that is not one", () => {
    const many = Array.from({ length: screenLimits.batch + 1 }, () => ({ kind: "down" }));
    const cases: readonly [unknown, string][] = [
      [send, "accepted"],
      [{ ...send, extra: 1 }, "shape"],
      [without(send, "rev"), "shape"],
      [{ ...send, seq: 0 }, "shape"],
      [{ ...send, intents: [] }, "shape"],
      [{ ...send, intents: many }, "shape"],
      [{ ...send, intents: many.slice(1) }, "accepted"],
      [{ ...send, intents: [{ kind: "down" }, { kind: "fly" }] }, "kind"],
      [{ ...send, intents: [{ kind: "type", text: "ab" }] }, "type-length"],
      [{ ...send, intents: [{ kind: "type", text: "\x1b" }] }, "type-control"],
      [{ ...send, intents: [{ kind: "paste", text: "a".repeat(pasteLimit + 1) }] }, "paste-length"],
      [{ ...send, intents: [{ kind: "down", also: 1 }] }, "shape"],
      ["down", "shape"],
      [null, "shape"],
      [[send], "shape"],
    ];
    expect(cases.map(([body]) => reasonOf(parseSend(body)))).toEqual(cases.map(([, reason]) => reason));
  });
  it("accepts a look and refuses, with its reason, each body that is not one", () => {
    const cases: readonly [unknown, string][] = [
      [look, "accepted"],
      [without(look, "client"), "accepted"],
      [{ ...look, extra: 1 }, "shape"],
      [without(look, "viewport"), "shape"],
      [without(look, "visible"), "shape"],
      [{ ...look, viewport: { rows: 0 } }, "shape"],
      [{ ...look, viewport: { rows: screenLimits.rows + 1 } }, "shape"],
      [{ ...look, viewport: { rows: 26, cols: 80 } }, "shape"],
      [{ ...look, viewport: { rows: 2.5 } }, "shape"],
      [42, "shape"],
    ];
    expect(cases.map(([body]) => reasonOf(parseLook(body)))).toEqual(cases.map(([, reason]) => reason));
  });
  it("carries every golden screen in a frame, and refuses a key or a reason the wire does not name", () => {
    const golden: unknown = JSON.parse(readFileSync(wireScreensPath, "utf8"));
    const entries: unknown[] =
      typeof golden === "object" && golden !== null && "screens" in golden && Array.isArray(golden.screens)
        ? golden.screens
        : [];
    const screens = entries.map(entry =>
      typeof entry === "object" && entry !== null && "screen" in entry ? entry.screen : 0,
    );
    expect(screens.length).toBeGreaterThan(50);
    const frames = screens.map((screen, n) => ({
      v: 1,
      epoch: "e1",
      client: "c1",
      seq: n,
      rev: n + 1,
      screen,
    }));
    expect(frames.filter(frame => !parseFrame(frame).ok)).toEqual([]);
    const [frame] = frames;
    expect(reasonOf(parseFrame({ ...frame, refused: "stale" }))).toBe("accepted");
    expect(reasonOf(parseFrame({ ...frame, refused: "paste-length" }))).toBe("accepted");
    expect(reasonOf(parseFrame({ ...frame, refused: "tired" }))).toBe("shape");
    expect(reasonOf(parseFrame({ ...frame, open: true }))).toBe("shape");
    expect(reasonOf(parseFrame({ ...frame, rev: 0 }))).toBe("shape");
    expect(reasonOf(parseFrame({ ...frame, v: 2 }))).toBe("shape");
    expect(reasonOf(parseFrame(undefined))).toBe("shape");
  });
});
