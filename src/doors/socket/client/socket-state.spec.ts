import { duplexPair } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";
import { serialize } from "node:v8";
import { expect, it } from "vitest";
import { socketHouse } from "../../../../tests/support/socket-house.ts";
import { shopRegistry, shopShown, type Shop } from "../../../../tests/support/shop.ts";
import { effect } from "../../../house/facts.ts";
import { identityView } from "../../../house/members.ts";
import { stateResult } from "../../../journal/readonly-state.ts";
import { houseRouter } from "../../../surface/bridge/assembly/house-router.ts";
import { socketConnection } from "./socket-connection.ts";
import { socketPorts } from "./socket-ports.ts";
it("g04c: more than 17 MiB opens and draws, also after restart", async () => {
  const f = await socketHouse("stream");
  try {
    for (let i = 0; i < 19; i++)
      f.house().bus.emit(
        effect(
          "tool-entry",
          {
            tool: "payments",
            target: "payments",
            author: "ana",
            text: "x".repeat(950_000),
          },
          "ana",
        ),
      );
    expect(serialize(stateResult(f.house().tools.state())).length).toBeGreaterThan(17 * 1024 * 1024);
    for (const restart of [false, true]) {
      if (restart) await f.reopen();
      const connection = socketConnection<Shop>("ana-terminal");
      const pair = duplexPair();
      f.attach(pair[1]);
      try {
        await connection.attach(pair[0]);
        expect(connection.state()).toEqual(identityView(f.house().tools.state(), "ana"));
        const router = houseRouter(
          socketPorts(connection, { registry: shopRegistry, limits: { recentLines: 40 } }),
          shopShown,
        );
        expect(router.screen({ rows: 20 }).title).toBe("Menú");
        router.stop();
      } finally {
        connection.close();
        pair[1].destroy();
      }
    }
  } finally {
    await f.close();
  }
}, 15000);
it("g04: a growing list sends its addition and idle lookups send no state", async () => {
  const f = await socketHouse("stream");
  try {
    f.house().bus.emit(
      effect(
        "tool-entry",
        {
          tool: "payments",
          target: "payments",
          author: "ana",
          text: "x".repeat(2_000_000),
        },
        "ana",
      ),
    );
    const c = await f.client("ana-terminal");
    let bytes = 0;
    c.socket.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
    });
    f.house().bus.emit(
      effect(
        "tool-entry",
        {
          tool: "payments",
          target: "payments",
          author: "ana",
          text: "una más",
        },
        "ana",
      ),
    );
    expect(await c.until(() => c.states.length === 2)).toBe(true);
    expect(bytes).toBeLessThan(8192);
    expect(c.states.at(-1)).toEqual(identityView(f.house().tools.state(), "ana"));
    c.send({ type: "read", id: "catalog", what: "catalog" });
    expect(await c.until(() => c.messages.some(m => m.type === "response"))).toBe(true);
    await delay(20);
    expect(c.states).toHaveLength(2);
  } finally {
    await f.close();
  }
});
