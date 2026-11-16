// One bound for the data of an act (actLimits.inputBytes): what enters by the mind at the exact border also enters by
// the terminal, because a JSON frame holds that bound plus room for its envelope; one byte more is refused in view.
import { duplexPair } from "node:stream";
import { Type } from "@sinclair/typebox";
import { afterEach, expect, it } from "vitest";
import { object } from "../../catalogs/acts.ts";
import { actLimits, socketLimits } from "../../catalogs/levers.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
import { toolAct } from "../../tools/act-definition.ts";
import { houseDoor } from "./house-door.ts";
import { clientFrame } from "./frame.ts";
import { zeroHouse } from "../../../tests/support/zero-house.ts";
import { zeroMind } from "../../../tests/support/zero-mind.ts";
import { probe } from "../../../tests/support/socket-probe.ts";
import type { Shop } from "../../../tests/support/shop.ts";
const doors: { close: () => Promise<unknown> }[] = [];
afterEach(async () => {
  for (const door of doors.splice(0)) await door.close();
});
const note = toolAct<Shop, ReturnType<typeof object>>(object({ text: Type.String() }), () => ({ status: "accepted" }));
/** The data of one act as the mind measures it: the act, its target and its input, as JSON. */
const sized = (bytes: number) => {
  const empty = { act: "note", input: { text: "" }, target: "desk" };
  const text = "x".repeat(bytes - Buffer.byteLength(JSON.stringify(empty)));
  const act = { ...empty, input: { text } };
  expect(Buffer.byteLength(JSON.stringify(act))).toBe(bytes);
  return act;
};
function opened() {
  const mind = zeroMind("desk", { note });
  const rig = zeroHouse(mind);
  rig.kit(["note"]);
  const door = houseDoor(rig.house(), new Map([["ana-terminal", { identity: "ana", door: "terminal" } as const]]));
  doors.push(door);
  const client = async () => {
    const [near, far] = duplexPair();
    const peer = await probe(near);
    door.accept(far);
    peer.hello("ana-terminal");
    await peer.until(() => peer.messages.some(m => m.tipo === "bienvenida"));
    return peer;
  };
  return { mind, rig, client };
}
it("the mind takes an act at the exact bound and refuses one byte more in view, writing nothing", async () => {
  const { mind, rig } = opened();
  const border = sized(actLimits.inputBytes);
  expect(await mind.startup().act(border)).toStrictEqual({ status: "accepted" });
  const before = rig.facts().length;
  const over = sized(actLimits.inputBytes + 1);
  expect(await mind.startup().act(over)).toStrictEqual({ status: "rejected", reason: toolTexts.invalid });
  expect(rig.facts()).toHaveLength(before);
});
it("the same act at the exact bound enters by the terminal; a frame one byte past its limit cuts only it", async () => {
  const { rig, client } = opened();
  const ana = await client();
  ana.send({ tipo: "acto", id: "mirar", act: "attend", input: { target: "desk" }, through: 0 });
  expect((await ana.result("mirar"))?.status).toBe("accepted");
  const border = sized(actLimits.inputBytes);
  const message = { tipo: "acto", id: "borde", ...border, through: 0 } as const;
  const frame = clientFrame(message);
  expect(frame.length - 5).toBeLessThanOrEqual(socketLimits.json);
  expect(frame.length - 5 - actLimits.inputBytes).toBeLessThan(64 * 1024);
  ana.send(message);
  expect(await ana.result("borde")).toMatchObject({ status: "accepted" });
  // One byte past the frame limit: the terminal cannot even build it, and the house cuts a peer that sends it.
  expect(() => clientFrame({ ...message, input: { text: "x".repeat(socketLimits.json) } })).toThrow(socketTexts.frame);
  const other = await client();
  const before = rig.house().tools.state().through;
  const header = Buffer.alloc(5);
  header.writeUInt32BE(socketLimits.json + 2);
  other.socket.write(header);
  expect(await other.until(other.closed)).toBe(true);
  expect(rig.house().tools.state().through).toBe(before);
  ana.send({ tipo: "acto", id: "sigue", act: "attend", input: { target: "desk" }, through: 0 });
  expect((await ana.result("sigue"))?.status).toBe("accepted");
});
it("today the terminal still carries an act between the act bound and the frame limit (contracts step)", async () => {
  const { mind, client } = opened();
  const ana = await client();
  ana.send({ tipo: "acto", id: "mirar", act: "attend", input: { target: "desk" }, through: 0 });
  await ana.result("mirar");
  const over = sized(actLimits.inputBytes + 1);
  expect(await mind.startup().act(over)).toStrictEqual({ status: "rejected", reason: toolTexts.invalid });
  ana.send({ tipo: "acto", id: "pasado", ...over, through: 0 });
  expect(await ana.result("pasado")).toMatchObject({ status: "accepted" });
});
