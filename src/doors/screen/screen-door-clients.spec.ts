// The clients of one session: how many it holds, who gives up a place, and what ends with a router left behind.
import { describe, expect, it } from "vitest";
import { collect, flush, spyDoor, spyHouse } from "../../../tests/support/screen-spy.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
import { SocketOpeningError } from "../socket/wire/socket-error.ts";
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
  it("ends the streams of a router left behind when the next one cannot be opened", async () => {
    const opens = [
      () => Promise.resolve(spyHouse().house),
      () => Promise.reject(new SocketOpeningError(socketTexts.startFailed)),
    ];
    const { door } = spyDoor(() => (opens.shift() ?? (() => Promise.reject(new Error("no more"))))());
    const a = await door.look("s", "h", view);
    const stream = attach(door, a);
    await door.send("s", "h", { ...firstBatch(a), intents: [{ kind: "quit" }] });
    await flush();
    expect([stream.done(), door.alive()]).toEqual([true, 0]);
  });
  it("opens no router for a first look from a hidden tab, which nothing may be drawn for yet", async () => {
    const { door, opens } = spyDoor();
    await expect(door.look("s", "h", { ...view, visible: false })).rejects.toThrow("nothing is drawn yet");
    expect([opens.length, door.alive()]).toEqual([0, 0]);
    const shown = await door.look("s", "h", view);
    expect([shown.refused, opens.length, door.alive()]).toEqual([undefined, 1, 1]);
  });
});
