// The clients of one session: how many it holds, and who gives up a place when a new one comes.
import { describe, expect, it } from "vitest";
import { collect, spyDoor } from "../../../tests/support/screen-spy.ts";
import type { Frame } from "./screen-wire.ts";

const view = { visible: true, viewport: { rows: 20 } };
const firstBatch = (frame: Frame) => ({
  epoch: frame.epoch,
  client: frame.client,
  seq: 1,
  rev: frame.rev,
  intents: [{ kind: "down" }],
});
const attach = (door: ReturnType<typeof spyDoor>["door"], frame: Frame) =>
  collect(door.stream("s", "h", frame.client, new AbortController().signal));

describe("the clients of a session", () => {
  it("S14: takes as many attached clients as the house takes channels per key, and refuses one more", async () => {
    const { door, opens } = spyDoor();
    const frames: Frame[] = [];
    for (let n = 0; n < 8; n++) frames.push(await door.look("s", "h", view));
    frames.forEach(frame => attach(door, frame));
    expect(frames.filter(frame => frame.refused)).toEqual([]);
    expect(new Set(frames.map(frame => frame.client)).size).toBe(8);
    const ninth = await door.look("s", "h", view);
    expect([ninth.refused, ninth.client, opens.length]).toEqual(["client", "", 1]);
  });
  it("S14: gives the place of a client that left (a tab reloaded, closed) to a new one, oldest first", async () => {
    const { door } = spyDoor();
    const frames: Frame[] = [];
    for (let n = 0; n < 8; n++) frames.push(await door.look("s", "h", view));
    const [oldest, second] = frames;
    if (!oldest || !second) throw new Error("eight looks gave fewer frames");
    frames.slice(2).forEach(frame => attach(door, frame));
    await door.look("s", "h", { ...view, client: oldest.client });
    const ninth = await door.look("s", "h", view);
    expect([ninth.refused, frames.some(frame => frame.client === ninth.client)]).toEqual([undefined, false]);
    const gone = await door.send("s", "h", firstBatch(second));
    const kept = await door.send("s", "h", firstBatch(oldest));
    expect([gone.refused, kept.refused]).toEqual(["client", undefined]);
  });
});
