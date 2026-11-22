// The terminal renderer against the contract: it paints, reads its own grid back as plain data and hands it to the kit.
import { describe, expect, it } from "vitest";
import { walked } from "../../../tests/support/surface-tools.ts";
import { catalog, drawn, hintKeys, sent, size } from "../../../tests/support/terminal-drawn.ts";
import { conformance } from "../../checks/renderer-conformance.ts";
import { hintSends } from "../../surface/contract/hint-sends.ts";
import { bytesOf } from "./cells.ts";
import { keyNames, paint } from "./paint.ts";

describe("the terminal renderer, against the contract", () => {
  it("draws what the contract says on every reachable screen, and adds no word of its own", async () => {
    const stops = await walked();
    expect(stops.length).toBeGreaterThan(50);
    const failures = new Map<string, string>();
    for (const { screen, path } of stops) {
      const grid = paint(screen, size);
      expect(bytesOf(grid)).not.toBe("");
      for (const { check, missing } of conformance(screen, drawn(screen, grid), catalog))
        if (!failures.has(`${check}: ${missing}`)) failures.set(`${check}: ${missing}`, JSON.stringify(path));
    }
    /** Each failure once, with the first path that shows it. */
    expect([...failures].map(([failure, path]) => `${failure} at ${path}`)).toEqual([]);
  });
  it("reaches a thread with a panel, a walk with options and a result", async () => {
    const screens = (await walked()).map(stop => stop.screen);
    expect(screens.some(screen => screen.panel?.focused)).toBe(true);
    expect(screens.some(screen => screen.panel && !screen.panel.focused)).toBe(true);
    expect(screens.some(screen => screen.body.kind === "thread" && screen.body.options?.length)).toBe(true);
    expect(screens.some(screen => screen.hints.some(hint => hint.does === "cerrar"))).toBe(true);
  });
  it("sends, for each hint, what the table says it sends", () => {
    for (const hint of hintKeys) {
      const sends = hintSends[hint];
      expect(sent(keyNames[hint]), hint).toEqual(sends === "move" ? [{ kind: "up" }, { kind: "down" }] : [sends]);
    }
  });
});
