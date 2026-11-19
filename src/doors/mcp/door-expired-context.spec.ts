// A completed request cannot retain authority to start detached acts after its credential is revoked.
import { expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { startHouse } from "../../runtime/house-runtime.ts";
import { doorAccess } from "../../runtime/door-access.ts";
import { shopProgram, type Shop } from "../../../tests/support/shop.ts";
import { rpcRequest } from "../../../tests/support/door-house.ts";
import { MemoryHouseKeys } from "../../keychain/custody/house-keys.ts";
import type { ActContext } from "../../tools/tool-contract.ts";
import { isRecord } from "../../fields/json-values.ts";
import { mcpDoor } from "./mcp-handler.ts";
it.each([false, true])("rejects a detached continuation after revocation (pending child=%s)", async lingering => {
  let captured: ActContext<Shop> | undefined;
  let release = () => {};
  const blocked = new Promise<void>(resolve => {
    release = resolve;
  });
  let detached: Promise<unknown> | undefined;
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
          run: async (input: unknown, context: ActContext<Shop>) => {
            captured = context;
            if (lingering && isRecord(input) && input.sale === "original")
              detached = context.execute?.({ act: "register", target: "sales", input: { sale: "child", total: 1500 } });
            if (lingering && isRecord(input) && input.sale === "child") await blocked;
            return action.run(input, context);
          },
        },
      },
    };
  });
  const home = mkdtempSync("/tmp/desert-expired-context-"),
    key = "synthetic-detached-credential";
  const house = startHouse(home, {
    ...shopProgram,
    registry,
    identities: true,
    secretKeys: new MemoryHouseKeys(),
    by: "house",
    creation: { admin: "ana", assignments: [{ identity: "beto", tools: ["sales"] }] },
    founderDoorKeys: { read: () => new Map([[key, { identity: "beto", door: "agente" }]]), present: () => false },
  });
  const access = doorAccess(house.bus, () => house.tools.state().house, house.now);
  const door = mcpDoor(house, { name: "Test", version: "1", limits: { recentLines: 20 } });
  try {
    await door.handle(
      rpcRequest(key, {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "actuar",
          arguments: { programa: "sales", accion: "register", datos: { sale: "original", total: 1500 } },
        },
      }),
    );
    expect(house.tools.state().tools.sales.has("original")).toBe(true);
    if (!captured?.execute) throw new Error("Missing captured execution");
    const retained = captured;
    house.tools.act({ act: "attend", input: { target: "identities/beto" } }, house.tools.state().through, "ana");
    expect(
      house.tools.act(
        { act: "revoke-key", target: "identities/beto", input: { key: access.get(key)?.id } },
        house.tools.state().through,
        "ana",
      ).status,
    ).toBe("accepted");
    const result = await retained.execute?.({
      act: "register",
      target: "sales",
      input: { sale: "detached", total: 1500 },
    });
    expect(result?.status).toBe("interrupted");
    expect(house.tools.state().tools.sales.has("detached")).toBe(false);
  } finally {
    release();
    await detached;
    await door.close();
    house.close();
    rmSync(home, { recursive: true, force: true });
  }
});
