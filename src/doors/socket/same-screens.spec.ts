import { duplexPair } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";
import { expect, it } from "vitest";
import { socketHouse } from "../../../tests/support/socket-house.ts";
import { shopRegistry, shopShown, type Shop } from "../../../tests/support/shop.ts";
import { localPorts } from "../../programs/house-runtime.ts";
import { houseRouter } from "../../surface/bridge/house-router.ts";
import { bytesOf } from "../terminal/cells.ts";
import { paint } from "../terminal/paint.ts";
import { keysOf } from "../terminal/input.ts";
import { socketConnection } from "./socket-connection.ts";
import { socketPorts } from "./socket-ports.ts";
it("the same keys produce byte-identical settled frames and identical act facts on both doors", async () => {
  const local = await socketHouse("stream");
  const remote = await socketHouse("stream");
  const connection = socketConnection<Shop>("ana-terminal");
  const pair = duplexPair();
  remote.attach(pair[1]);
  await connection.attach(pair[0]);
  const ports = socketPorts(connection, { registry: shopRegistry, limits: { recentLines: 40 } });
  const a = houseRouter(localPorts(local.house(), "ana", { recentLines: 40 }), shopShown);
  const b = houseRouter(ports, shopShown);
  try {
    expect(ports.connection()).toBe("connected");
    for (const key of ["", "v", "r", "1", "\r", "1500", "\r", "\x1b", "\x0f", "a", "\x0f", "l"]) {
      for (const intent of keysOf(key)) {
        a.send(intent);
        b.send(intent);
      }
      await a.idle();
      await b.idle();
      // Drawing itself may attend notices; settle those acts and wait for their actual state frame too.
      for (let n = 0; n < 4; n++) {
        a.screen({ rows: 26 });
        b.screen({ rows: 26 });
        await a.idle();
        await b.idle();
        await delay(10);
      }
      expect(ports.state().through).toBe(remote.house().tools.state().through);
      for (const size of [
        { cols: 40, rows: 16 },
        { cols: 80, rows: 16 },
        { cols: 70, rows: 44 },
      ]) {
        const frame = (router: typeof a) => bytesOf(paint(router.screen({ rows: size.rows - 4 }), size));
        expect(frame(b)).toBe(frame(a));
      }
    }
    const acts = (f: typeof local) =>
      f
        .house()
        .journal.replay<unknown[]>([], (all, a) =>
          a.layer === "house" && a.kind === "act" ? [...all, { by: a.by, data: a.data }] : all,
        );
    expect(acts(remote)).toEqual(acts(local));
    expect(acts(remote).length).toBeGreaterThan(0);
    expect(local.house().tools.state().tools.sales.size).toBe(1);
  } finally {
    a.stop();
    b.stop();
    connection.close();
    pair[1].destroy();
    await local.close();
    await remote.close();
  }
});
