import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { collect, flush, spyDoor, spyHouse } from "../../../tests/support/screen-spy.ts";
import { filesUnder, isSpec, parsed, src } from "../../../tests/support/sources.ts";
import { journalTexts } from "../../texts/journal.texts.ts";
import { screenDoorTexts } from "../../texts/screen-door.texts.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
import { SocketOpeningError } from "../socket/wire/socket-error.ts";
import type { Frame } from "./screen-wire.ts";

const view = { visible: true, viewport: { rows: 20 } };
const batch = (frame: Frame, seq: number, intents: readonly unknown[] = [{ kind: "down" }]) => ({
  epoch: frame.epoch,
  client: frame.client,
  seq,
  rev: frame.rev,
  intents,
});
const attachTo = (door: ReturnType<typeof spyDoor>["door"], frame: Frame, session = "s") => {
  const signal = new AbortController();
  return { ...collect(door.stream(session, "h", frame.client, signal.signal)), leave: () => signal.abort() };
};
const eventsOf = (frame: Frame) =>
  frame.screen.body.kind === "thread"
    ? frame.screen.body.events.map(event => event.text.map(span => span.text).join(""))
    : [];
const textOf = (frame: Frame | undefined) =>
  frame?.screen.body.kind === "list" ? frame.screen.body.stacks.flatMap(stack => stack.rows.map(row => row.title)) : [];

describe("the screen door's sessions", () => {
  it("S1: opens one router per session and house on its first look, and refuses a batch of another epoch", async () => {
    const { door, opens, houses } = spyDoor();
    const a = await door.look("s1", "h", view);
    await door.look("s1", "h", { ...view, client: a.client });
    expect(opens).toEqual([{ id: "s1", house: "h" }]);
    const b = await door.look("s2", "h", view);
    await door.look("s1", "h2", view);
    expect(opens).toEqual([
      { id: "s1", house: "h" },
      { id: "s2", house: "h" },
      { id: "s1", house: "h2" },
    ]);
    expect(b.epoch).not.toBe(a.epoch);
    const refused = await door.send("s1", "h", { ...batch(a, 1), epoch: b.epoch });
    expect(refused).toEqual({ ...a, refused: "epoch" });
    expect(houses[0]?.counts.send).toBe(0);
    expect(door.alive()).toBe(3);
  });
  it("S2: draws only for a client that is attached and visible", async () => {
    const { door, houses } = spyDoor();
    const a = await door.look("s", "h", view);
    const hidden = await door.look("s", "h", { ...view, client: a.client, visible: false });
    expect(hidden).toEqual(a);
    const spy = houses[0];
    attachTo(door, a);
    const b = await door.look("s", "h", { ...view, viewport: { rows: 30 } });
    expect(spy?.counts.screen).toBe(2);
    for (let n = 0; n < 10; n++) spy?.fire();
    expect(spy?.counts.screen).toBe(2);
    attachTo(door, b);
    for (let n = 0; n < 10; n++) spy?.fire();
    expect(spy?.counts.screen).toBe(12);
  });
  it("S3: draws nothing without a viewport, and has no room of its own to draw for", async () => {
    const { door, houses, opens } = spyDoor();
    const a = await door.look("s", "h", view);
    const refused = await door.look("s", "h", { client: a.client, visible: true });
    expect(refused).toEqual({ ...a, refused: "shape" });
    expect(houses[0]?.counts.screen).toBe(1);
    await expect(door.look("other", "h", { visible: true })).rejects.toThrow("nothing is drawn yet");
    expect(opens.length).toBe(1);
  });
  it("S4: gives each client its own room and rev, and draws once per room per change", async () => {
    const { door, houses } = spyDoor();
    const small = await door.look("s", "h", { ...view, viewport: { rows: 10 } });
    const tall = await door.look("s", "h", view);
    const twin = await door.look("s", "h", view);
    const streams = [small, tall, twin].map(frame => attachTo(door, frame));
    const spy = houses[0];
    const before = spy?.counts.screen ?? 0;
    if (spy) spy.state.text = "Dos";
    spy?.fire();
    await flush();
    expect((spy?.counts.screen ?? 0) - before).toBe(2);
    expect(streams.map(stream => stream.got.length)).toEqual([1, 1, 1]);
    const [first, second, third] = streams.map(stream => stream.got[0]);
    expect(typeof first === "object" && textOf(first)).toEqual(["Dos", "10"]);
    expect(typeof second === "object" && textOf(second)).toEqual(["Dos", "20"]);
    expect(typeof third === "object" && third.client).toBe(twin.client);
    expect([first, second].map(frame => typeof frame === "object" && frame.rev)).toEqual([2, 2]);
  });
});
describe("the screen door's order", () => {
  it("S5 and S8: applies the next batch once, answers a repeat, refuses a gap and an old one, per client", async () => {
    const { door, houses } = spyDoor();
    const a = await door.look("s", "h", view);
    const b = await door.look("s", "h", view);
    const spy = houses[0];
    const sends = () => spy?.counts.send;
    const one = await door.send("s", "h", batch(a, 1, [{ kind: "down" }, { kind: "up" }]));
    expect([one.seq, one.refused, sends()]).toEqual([1, undefined, 2]);
    const again = await door.send("s", "h", batch(a, 1));
    expect([again.seq, again.refused, sends()]).toEqual([1, undefined, 2]);
    const refusals = [
      [batch(a, 3), "gap"],
      [{ ...batch(a, 2), client: "nobody" }, "client"],
      [{ ...batch(a, 2), epoch: "old" }, "epoch"],
      [{ ...batch(a, 2), extra: true }, "shape"],
      [batch(a, 2, [{ kind: "type", text: "ab" }]), "type-length"],
      ["down", "shape"],
    ] as const;
    for (const [body, reason] of refusals) {
      const frame = await door.send("s", "h", body);
      expect([frame.refused, frame.screen, sends()]).toEqual([reason, one.screen, 2]);
    }
    expect((await door.send("s", "h", batch(a, 2))).seq).toBe(2);
    const old = await door.send("s", "h", batch(a, 1));
    expect([old.refused, old.seq, sends()]).toEqual(["old", 2, 3]);
    expect((await door.send("s", "h", batch(b, 1))).seq).toBe(1);
    expect((await door.send("s", "h", batch(a, 3))).seq).toBe(3);
    expect(spy?.sent.map(intent => intent.kind)).toEqual(["down", "up", "down", "down", "down"]);
  });
  it("S9: pushes a frame only when what travels changed, and a keepalive to a silent stream", async () => {
    const { door, houses, clock } = spyDoor();
    const a = await door.look("s", "h", view);
    const stream = attachTo(door, a);
    const spy = houses[0];
    spy?.fire();
    await flush();
    expect(stream.got).toEqual([]);
    if (spy) spy.state.text = "Dos";
    spy?.fire();
    spy?.fire();
    await flush();
    expect(stream.got.map(item => typeof item === "object" && item.rev)).toEqual([a.rev + 1]);
    clock.advance(14_999);
    await flush();
    expect(stream.got.length).toBe(1);
    clock.advance(1);
    await flush();
    expect(stream.got.at(-1)).toBe("keepalive");
    stream.leave();
    await flush();
    expect(stream.done()).toBe(true);
  });
  it("S11: a quit closes the router, and its frame is the first screen of a new epoch", async () => {
    const { door, houses, opens } = spyDoor();
    const a = await door.look("s", "h", view);
    const left = await door.send("s", "h", batch(a, 1, [{ kind: "quit" }, { kind: "down" }]));
    expect(houses[0]?.counts).toMatchObject({ stop: 1, close: 1, send: 1 });
    expect(opens.length).toBe(2);
    expect([left.epoch === a.epoch, left.seq, left.client]).toEqual([false, 0, a.client]);
    expect(houses[1]?.counts.screen).toBe(1);
    expect((await door.send("s", "h", { ...batch(left, 1) })).refused).toBeUndefined();
    expect(door.alive()).toBe(1);
  });
  it("S12: a house that ended closes its session, and the next look opens another", async () => {
    const { door, houses, opens } = spyDoor();
    const a = await door.look("s", "h", view);
    const stream = attachTo(door, a);
    const spy = houses[0];
    if (spy) spy.state.ended = true;
    spy?.fire();
    await flush();
    expect([spy?.counts.close, door.alive(), stream.done()]).toEqual([1, 0, true]);
    const again = await door.look("s", "h", { ...view, client: a.client });
    expect([opens.length, again.epoch === a.epoch, door.alive()]).toEqual([2, false, 1]);
  });
  it("S13: puts nothing a client sent in an error or in a frame", async () => {
    const { door } = spyDoor();
    const pasted = [{ kind: "paste", text: "clave-secreta" }];
    const lost = await door.send("nobody", "h", { epoch: "e", client: "c", seq: 1, rev: 1, intents: pasted });
    const failed = await door.look("nobody", "h", { visible: "clave-secreta" }).catch((error: unknown) => error);
    const a = await door.look("s", "h", view);
    const refused = await door.send("s", "h", { ...batch(a, 1, pasted), extra: "clave-secreta" });
    expect(failed).toBeInstanceOf(Error);
    expect([lost, failed, refused].filter(said => (JSON.stringify(said) + String(said)).includes("clave"))).toEqual([]);
  });
  it("S14: takes as many clients as the house takes channels per key, and refuses one more", async () => {
    const { door, opens } = spyDoor();
    const frames = [];
    for (let n = 0; n < 8; n++) frames.push(await door.look("s", "h", view));
    expect(frames.filter(frame => frame.refused)).toEqual([]);
    expect(new Set(frames.map(frame => frame.client)).size).toBe(8);
    const ninth = await door.look("s", "h", view);
    expect([ninth.refused, ninth.client, opens.length]).toEqual(["client", "", 1]);
  });
});
describe("the cut of a session nobody looks at", () => {
  it("S10: closes a session with no client and no request for thirty minutes, on the host's clock", async () => {
    const { door, houses, clock } = spyDoor();
    await door.look("s", "h", view);
    clock.advance(29 * 60_000 + 59_000);
    expect(door.alive()).toBe(1);
    clock.advance(1000);
    expect([houses[0]?.counts.stop, houses[0]?.counts.close, door.alive()]).toEqual([1, 1, 0]);
  });
  it("S10: counts the thirty minutes again from a look, and not at all while a stream is attached", async () => {
    const { door, houses, clock } = spyDoor();
    const a = await door.look("s", "h", view);
    clock.advance(29 * 60_000);
    await door.look("s", "h", { ...view, client: a.client });
    clock.advance(29 * 60_000);
    expect(door.alive()).toBe(1);
    const stream = attachTo(door, a);
    clock.advance(120 * 60_000);
    expect(door.alive()).toBe(1);
    stream.leave();
    await flush();
    clock.advance(30 * 60_000 - 1);
    expect(door.alive()).toBe(1);
    clock.advance(1);
    expect([houses[0]?.counts.stop, door.alive(), stream.done()]).toEqual([1, 0, true]);
  });
  it("S10: keeps no timer of its own: the door's sources name no setTimeout, setInterval or Date.now", () => {
    const named = filesUnder(join(src, "doors/screen"))
      .filter(file => !isSpec(file))
      .flatMap(file => {
        const found: string[] = [];
        const visit = (node: ts.Node): void => {
          const text = ts.isIdentifier(node) || ts.isPropertyAccessExpression(node) ? node.getText() : "";
          if (["setTimeout", "setInterval", "setImmediate", "Date.now"].includes(text)) found.push(`${file}: ${text}`);
          ts.forEachChild(node, visit);
        };
        visit(parsed(file));
        return found;
      });
    expect(named).toEqual([]);
  });
});
describe("three silences that are a screen with its words", () => {
  const filled = ({ screen: { body } }: Frame) => {
    if (body.kind === "thread") return body.events.length;
    return body.kind === "list" ? body.stacks.length : body.lines.length;
  };
  it("puts a client back from a cut session on the new router, behind one notice that Enter leaves", async () => {
    const { door, opens } = spyDoor();
    const a = await door.look("s", "h", view);
    door.close("s");
    const lost = await door.send("s", "h", batch(a, 1));
    expect([lost.refused, lost.screen.state, opens.length]).toEqual(["epoch", "disconnected", 1]);
    expect(eventsOf(lost)).toEqual([screenDoorTexts.expired]);
    const back = await door.look("s", "h", { ...view, client: a.client });
    expect([opens.length, back.screen.title, eventsOf(back)]).toEqual([
      2,
      journalTexts.opening,
      [screenDoorTexts.expired],
    ]);
    expect(back.screen.hints.map(hint => hint.intent)).toEqual(["confirm"]);
    const left = await door.send("s", "h", batch(back, 1, [{ kind: "confirm" }]));
    expect([left.screen.title, left.refused]).toEqual(["Prueba", undefined]);
    expect([a, lost, back, left].map(filled).every(count => count > 0)).toBe(true);
  });
  it("shows why the house cannot be opened, with nothing to do but wait, and asks the host again", async () => {
    const node = socketTexts.node("24.9.0", "24.1.0");
    const failures = [new SocketOpeningError(node), new Error("detalle interno")];
    const { door, opens } = spyDoor(() => {
      const failure = failures.shift();
      return failure ? Promise.reject(failure) : Promise.resolve(spyHouse().house);
    });
    const first = await door.look("s", "h", view);
    expect([eventsOf(first), first.screen.state, first.screen.hints, first.screen.menu]).toEqual([
      [node],
      "disconnected",
      [],
      false,
    ]);
    const second = await door.look("s", "h", view);
    expect(eventsOf(second)).toEqual([socketTexts.startFailed]);
    const third = await door.look("s", "h", view);
    expect([opens.length, third.screen.title, door.alive()]).toEqual([3, "Prueba", 1]);
    expect([first, second, third].map(filled).every(count => count > 0)).toBe(true);
  });
});
