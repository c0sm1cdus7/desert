// The screen door adds nothing and loses nothing: behind it, the house router draws and acts as it does by itself.
import { duplexPair } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";
import { expect, it } from "vitest";
import { fakeTime } from "../../../tests/support/screen-spy.ts";
import { socketHouse } from "../../../tests/support/socket-house.ts";
import { shopProgram, shopShown, type Shop } from "../../../tests/support/shop.ts";
import { localPorts } from "../../runtime/house-runtime.ts";
import { houseRouter } from "../../surface/bridge/assembly/house-router.ts";
import type { Router } from "../../surface/router/router.ts";
import { wire } from "../../surface/contract/wire.ts";
import { openHouseRouter, type OpenHouse } from "../socket/client/open-house-router.ts";
import { socketConnection } from "../socket/client/socket-connection.ts";
import { keysOf } from "../terminal/input.ts";
import { screenDoor, type WebShown } from "./screen-door.ts";

type Fixture = Awaited<ReturnType<typeof socketHouse>>;
type Frame = Awaited<ReturnType<ReturnType<typeof screenDoor>["look"]>>;
const shown: WebShown<Shop> = { ...shopShown, hour: at => new Date(at).toISOString().slice(11, 16) };
const view = { visible: true, viewport: { rows: 26 } } as const;
const keyLists = [
  ["v", "r", "1", "\r", "1500", "\r", "\x1b", "r", "1", "\r", "1500", "\r", "\x1b", "\x0f"],
  ["", "v", "r", "1", "\r", "1500", "\r", "\x1b", "\x0f", "a", "\x0f", "l"],
];
/** A door whose one router is the house's, reached over a socket connection on a duplex pair. */
async function behindTheDoor(remote: Fixture) {
  const connection = socketConnection<Shop>("ana-terminal");
  const pair = duplexPair();
  remote.attach(pair[1]);
  await connection.attach(pair[0]);
  const behind: OpenHouse[] = [];
  const door = screenDoor<Shop>({
    shown,
    time: fakeTime().time,
    epoch: () => `n${behind.length}`,
    open: () => {
      const house = openHouseRouter(connection, shopProgram, shown, { recentLines: 40 });
      behind.push(house);
      return Promise.resolve(house);
    },
  });
  const end = () => {
    door.close("s");
    pair[1].destroy();
  };
  return { door, behind, end };
}
/** Drawing itself may attend notices: settle those acts on both sides, as the terminal's own spec does. */
async function settled(a: Router, door: ReturnType<typeof screenDoor>, behind: OpenHouse[], frame: Frame) {
  for (let n = 0; n < 4; n++) {
    a.screen({ rows: 26 });
    frame = await door.look("s", "casa", { ...view, client: frame.client });
    await a.idle();
    await behind[0]?.router.idle();
    await delay(10);
  }
  return door.look("s", "casa", { ...view, client: frame.client });
}
const acts = (f: Fixture) =>
  f
    .house()
    .journal.replay<unknown[]>([], (all, e) =>
      e.layer === "house" && e.kind === "act" ? [...all, { by: e.by, data: e.data }] : all,
    );
it.each(keyLists.map((keys, n) => [n, keys] as const))(
  "draws behind the door what the house router draws by itself, and acts the same: list %i",
  async (_, keys) => {
    const [local, remote] = [await socketHouse("stream"), await socketHouse("stream")];
    const { door, behind, end } = await behindTheDoor(remote);
    const a = houseRouter(localPorts(local.house(), "ana", { recentLines: 40 }), shown);
    try {
      let frame = await door.look("s", "casa", view);
      for (const [index, key] of keys.entries()) {
        const intents = keysOf(key);
        intents.forEach(intent => a.send(intent));
        if (intents.length) {
          const body = { epoch: frame.epoch, client: frame.client, seq: frame.seq + 1, rev: frame.rev, intents };
          frame = await door.send("s", "casa", body);
          expect([index, frame.refused]).toEqual([index, undefined]);
        }
        frame = await settled(a, door, behind, frame);
        expect([index, frame.screen]).toEqual([index, wire(a.screen({ rows: 26 }))]);
      }
      expect(acts(remote)).toEqual(acts(local));
      expect(acts(remote).length).toBeGreaterThan(0);
      expect(behind.length).toBe(1);
    } finally {
      a.stop();
      end();
      await local.close();
      await remote.close();
    }
  },
);
