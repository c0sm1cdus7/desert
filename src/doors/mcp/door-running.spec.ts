// An already running local act loses its effects on revocation; an external effect already done remains explicit.
import { expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { duplexPair } from "node:stream";
import { startHouse } from "../../runtime/house-runtime.ts";
import { liveDoorKeys } from "../socket/peers/live-door-keys.ts";
import { shopProgram } from "../../../tests/support/shop.ts";
import { rpcRequest } from "../../../tests/support/door-house.ts";
import { probe } from "../../../tests/support/socket-probe.ts";
import { mcpDoor } from "./mcp-handler.ts";
import { houseDoor } from "../socket/server/house-door.ts";
import { MemoryHouseKeys } from "../../keychain/custody/house-keys.ts";
import type { ActContext } from "../../tools/tool-contract.ts";
import type { Shop } from "../../../tests/support/shop.ts";
const registration = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "act",
    arguments: { program: "sales", action: "register", data: { sale: "suspended", total: 1500 } },
  },
};
const key = "synthetic-running-credential",
  other = "synthetic-second-credential";
it.each([
  ["mcp", false, false, false],
  ["socket", false, false, false],
  ["socket", false, false, true],
  ["mcp", false, true, false],
  ["socket", false, true, false],
  ["mcp", true, false, false],
] as const)(
  "handles an in-flight act through %s (external effect already done=%s)",
  async (mode, external, nested, disconnected) => {
    let entered = () => {},
      release = () => {};
    const started = new Promise<void>(resolve => {
      entered = resolve;
    });
    const blocked = new Promise<void>(resolve => {
      release = resolve;
    });
    let context: ActContext<Shop> | undefined;
    let externalEffects = 0;
    let nestedStatus: string | undefined;
    const registry = shopProgram.registry.map(tool => {
      if (tool.id !== "sales") return tool;
      const action = tool.acts.register;
      if (!action) throw new Error("Missing register action");
      return {
        ...tool,
        acts: {
          ...tool.acts,
          register: {
            ...action,
            reach: external ? ("world" as const) : ("house" as const),
            run: async (input: unknown, current: ActContext<Shop>) => {
              context = current;
              if (external) externalEffects++;
              entered();
              await blocked;
              if (nested)
                nestedStatus = (
                  await current.execute?.({ act: "register", target: "sales", input: { sale: "nested", total: 1500 } })
                )?.status;
              return action.run(input, current);
            },
          },
        },
      };
    });
    const home = mkdtempSync("/tmp/desert-running-door-");
    const kind = mode === "mcp" ? "agent" : "terminal";
    const house = startHouse(home, {
      ...shopProgram,
      registry,
      identities: true,
      secretKeys: new MemoryHouseKeys(),
      by: "house",
      creation: { admin: "ana", assignments: [{ identity: "beto", tools: ["sales"] }] },
      founderDoorKeys: {
        read: () =>
          new Map([
            [key, { identity: "beto", door: kind }],
            [other, { identity: "beto", door: kind }],
          ]),
        present: () => false,
      },
    });
    const access = liveDoorKeys(house);
    const mcp = mcpDoor(house, { name: "Test", version: "1", limits: { recentLines: 20 } });
    const socket = houseDoor(house, undefined, { report: () => {} });
    const [client, server] = duplexPair();
    try {
      let pending: ReturnType<typeof mcp.handle> | undefined;
      if (mode === "mcp") pending = mcp.handle(rpcRequest(key, registration));
      else {
        const peer = await probe(client);
        socket.accept(server);
        peer.hello(key);
        expect(await peer.until(() => peer.messages.some(message => message.tipo === "bienvenida"))).toBe(true);
        peer.send({
          tipo: "acto",
          id: "attend",
          act: "attend",
          input: { target: "sales" },
          through: house.tools.state().through,
        });
        await peer.result("attend");
        peer.send({
          tipo: "acto",
          id: "register",
          act: "register",
          target: "sales",
          input: { sale: "suspended", total: 1500 },
          through: house.tools.state().through,
        });
      }
      await started;
      if (disconnected) {
        client.destroy();
        server.destroy();
        await new Promise(resolve => setImmediate(resolve));
        expect(context?.signal?.aborted).toBe(false);
      }
      house.tools.act({ act: "attend", input: { target: "identities/beto" } }, house.tools.state().through, "ana");
      const revoked = house.tools.act(
        { act: "revoke-key", target: "identities/beto", input: { key: access.get(key)?.id } },
        house.tools.state().through,
        "ana",
      );
      expect(revoked.status).toBe("accepted");
      if (pending) expect((await pending).status).toBe(401);
      expect(context?.signal?.aborted).toBe(true);
      release();
      await new Promise(resolve => setImmediate(resolve));
      expect(house.tools.state().tools.sales.has("suspended")).toBe(external);
      expect(externalEffects).toBe(external ? 1 : 0);
      expect(house.tools.state().tools.sales.has("nested")).toBe(false);
      expect(nestedStatus).not.toBe("accepted");
      expect(access.get(other)?.identity).toBe("beto");
      expect(access.get(key)).toBeUndefined();
    } finally {
      release();
      client.destroy();
      server.destroy();
      socket.cancel();
      await mcp.close();
      house.close();
      rmSync(home, { recursive: true, force: true });
    }
  },
);
