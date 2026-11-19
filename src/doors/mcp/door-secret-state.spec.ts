// Both doors receive only protected references even when the program retains complete secret-bearing events.
import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { fixture, secret, words, field, type P } from "../../../tests/support/secret-rig.ts";
import { has } from "../../../tests/support/secret-search.ts";
import { mcpDoor } from "./mcp-handler.ts";
import { httpDoorFetch } from "../../../tests/support/http-door-fetch.ts";
import { connectRemoteTerminal } from "../terminal/remote-terminal-client.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { rpcRequest } from "../../../tests/support/door-house.ts";
it("never transfers secret material or door keys in initial state, differences or resynchronization", async () => {
  const rig = fixture(secret, (input, context) => ({
    status: "accepted",
    text: "Saved",
    effects: [words.fact("sale-registered", { value: String(field(input, "value")), copy: "public" }, context.by)],
  }));
  const key = randomUUID(),
    material = "synthetic-secret";
  const door = mcpDoor(rig.house, new Map([[key, { identity: "ana", door: "agent" }]]), {
    name: "Test",
    version: "1",
    limits: { recentLines: 20 },
  });
  const transport = httpDoorFetch(door.handle);
  expect((await settle(rig.set({ value: material }))).status).toBe("accepted");
  const client = await connectRemoteTerminal<P>("http://localhost/mcp", key, transport.send);
  try {
    for (const value of [material, "another-secret"]) {
      if (value !== material) await settle(rig.set({ value }));
      await new Promise(resolve => setTimeout(resolve, 30));
      expect([key, material, value].some(secret => has(client.state(), secret))).toBe(false);
      expect(client.state().tools.vault.length).toBeGreaterThan(0);
      const read = await door.handle(
        rpcRequest(key, {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "read", arguments: { program: "vault" } },
        }),
      );
      expect([key, material, value].some(secret => read.body.includes(secret))).toBe(false);
    }
    client.send({ tipo: "sincronizar" });
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(has(client.state(), material)).toBe(false);
  } finally {
    client.close();
    transport.disconnect();
    await door.close();
    rig.close();
  }
});
