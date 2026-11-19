// MCP creators receive each short invitation once; public readings and journals never reveal door material.
import { requestDigest } from "../socket/requests/public-message.ts";
import { expect, it } from "vitest";
import { doorHouse, rpcRequest } from "../../../tests/support/door-house.ts";
it.each(["new", "invite"])(
  "delivers the %s invitation privately through MCP and never returns a long key",
  async action => {
    const h = doorHouse(),
      door = h.door();
    try {
      const response = await door.handle(
        rpcRequest(h.founder, {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "actuar",
            arguments: {
              programa: "identities",
              accion: action,
              objetivo: action === "new" ? "identities" : "identities/beto",
              datos: action === "new" ? { identity: "luz", tools: [] } : { door: "agent" },
            },
          },
        }),
      );
      expect(response.status).toBe(200);
      const matches = response.body.match(/[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}/g);
      expect(matches?.length).toBe(1);
      const code = matches?.[0];
      if (!code) throw new Error("Missing private invitation");
      expect(h.history().includes(code)).toBe(false);
      const issued = h.access().redeem(code);
      if (!issued.key) throw new Error("Missing redeemed key");
      expect(response.body.includes(issued.key)).toBe(false);
      const read = await door.handle(
        rpcRequest(h.founder, {
          jsonrpc: "2.0",
          id: code,
          method: "tools/call",
          params: { name: "leer", arguments: { programa: "identities" } },
        }),
      );
      expect(read.status).toBe(200);
      expect(
        [code, issued.key, h.founder].some(value => read.body.includes(value) || h.history().includes(value)),
      ).toBe(false);
      const reflected = await door.handle(rpcRequest(h.founder, { jsonrpc: "2.0", id: issued.key, method: "ping" }));
      expect(reflected.body.includes(issued.key)).toBe(false);
      expect(JSON.parse(reflected.body)).toMatchObject({ id: requestDigest(issued.key), correlation: "sha256" });
      const ordinary = await door.handle(rpcRequest(h.founder, { jsonrpc: "2.0", id: "ordinary-id", method: "ping" }));
      expect(JSON.parse(ordinary.body)).toEqual({ jsonrpc: "2.0", id: "ordinary-id", result: {} });
      expect(h.access().redeem(code).status).toBe(400);
    } finally {
      await door.close();
      h.close();
    }
  },
);
