// A session driven over local HTTP with no UI: signing in, the Menu, a tool and an act, and what no response holds.
import { randomUUID } from "node:crypto";
import { duplexPair } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";
import { expect, it } from "vitest";
import { screenClient, screenHttp } from "../../../tests/support/screen-http.ts";
import { fakeTime } from "../../../tests/support/screen-spy.ts";
import { socketHouse } from "../../../tests/support/socket-house.ts";
import { shopProgram, shopShown, type Shop } from "../../../tests/support/shop.ts";
import type { Intent } from "../../surface/contract/contract.ts";
import { doorTexts } from "../../texts/doors.texts.ts";
import { surfaceTexts } from "../../texts/surface.texts.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { openHouseRouter } from "../socket/client/open-house-router.ts";
import { socketConnection } from "../socket/client/socket-connection.ts";
import { entryHouse } from "./entry-router.ts";
import { screenDoor, type WebShown } from "./screen-door.ts";
import type { Frame } from "./screen-wire.ts";

const key = "ana-terminal";
const invitation = "ABCD-2345";
const shown: WebShown<Shop> = { ...shopShown, hour: at => new Date(at).toISOString().slice(11, 16) };
const said = (frame: Frame): string => JSON.stringify(frame.screen);
/** A host whose session has no key until the entry redeems the invitation; then the house, over a socket pair. */
function signingDoor(remote: Awaited<ReturnType<typeof socketHouse>>) {
  let held: string | undefined;
  return screenDoor<Shop>({
    shown,
    time: fakeTime().time,
    epoch: () => randomUUID(),
    open: async () => {
      if (!held) {
        const redeem = (code: string) =>
          Promise.resolve(
            code === invitation
              ? ((held = key), { ok: true as const, text: "" })
              : { ok: false as const, reason: doorTexts.denied },
          );
        const bar = () => ({ state: "connected" as const, clock: shown.hour(Date.now()), now: Date.now() });
        return entryHouse({ redeem, bar, defect: () => toolTexts.baseFailure });
      }
      const connection = socketConnection<Shop>(held);
      const pair = duplexPair();
      remote.attach(pair[1]);
      await connection.attach(pair[0]);
      return openHouseRouter(connection, shopProgram, shown, { recentLines: 40 });
    },
  });
}
it("signs in, reaches the Menu, opens a tool and runs an act, over local HTTP with one stream", async () => {
  const remote = await socketHouse("stream");
  const door = signingDoor(remote);
  const http = await screenHttp(door, "casa");
  const client = await screenClient(http.url, "sesion=una-sesion", 26);
  const act = async (intents: readonly Intent[]) => expect((await client.act(intents)).refused).toBeUndefined();
  try {
    const entryEpoch = client.first.epoch;
    expect(client.first.screen.title).not.toBe("");
    await act([{ kind: "paste", text: invitation }, { kind: "confirm" }]);
    for (let n = 0; n < 200 && !client.pushed.some(known => known.epoch !== entryEpoch); n++) await delay(25);
    await client.until(looked => looked.epoch !== entryEpoch && looked.screen.title === "Menú");
    for (const text of ["v", "r", "1"]) await act([{ kind: "type", text }]);
    await act([{ kind: "confirm" }]);
    await act(Array.from("1500", text => ({ kind: "type", text })));
    await act([{ kind: "confirm" }]);
    await client.until(looked => said(looked).includes(surfaceTexts.ok));
    expect(remote.house().tools.state().tools.sales.size).toBe(1);
    expect(client.seen.filter(response => response.headers.get("cache-control") !== "no-store")).toEqual([]);
    const holding = (text: string) =>
      client.seen.filter(({ headers, body }) => [...headers.values(), body].join("\n").includes(text));
    expect(holding(key)).toEqual([]);
    expect(client.seen.filter(({ headers }) => [...headers.values()].join("\n").includes(invitation))).toEqual([]);
    // The entry's own frames show the code as it is written, as any written field does; nothing after it holds it.
    expect(holding(invitation).filter(response => response.epoch !== entryEpoch)).toEqual([]);
  } finally {
    client.leave();
    door.close("una-sesion");
    await http.close();
    await remote.close();
  }
});
