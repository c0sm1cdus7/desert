// Real loopback HTTP must preserve the same revocation ordering and independent redemption under abuse.
import { expect, it } from "vitest";
import { doorHouse, invitationCode } from "../../../tests/support/door-house.ts";
import { solveInvitationProof } from "../../runtime/invitation-proof.ts";
import { serveMcp } from "./mcp-http.ts";
it("does not start a sale after revocation and admits a proven redemption during HTTP abuse", async () => {
  const h = doorHouse(),
    door = h.door();
  let server: Awaited<ReturnType<typeof serveMcp>> | undefined;
  let stop = () => {};
  try {
    server = await serveMcp(door, { host: "127.0.0.1", port: 0 });
    const address = server.address;
    if (!address || typeof address === "string") throw new Error("Missing loopback address");
    const url = `http://127.0.0.1:${address.port}`;
    const post = (path: string, value: unknown, key?: string) =>
      fetch(`${url}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
        body: JSON.stringify(value),
      });
    const code = invitationCode(await h.act("new", { identity: "luz", tools: ["sales"] }));
    for (let attempt = 0; attempt < 20; attempt++) await post("/door/invitations/redeem", { code: "invalid" });
    const redeemed = await post("/door/invitations/redeem", { code, proof: solveInvitationProof(code) });
    expect(redeemed.status).toBe(200);
    const value: unknown = await redeemed.json();
    if (!value || typeof value !== "object" || !("key" in value) || typeof value.key !== "string")
      throw new Error("Missing credential");
    const key = value.key,
      id = h.access().get(key)?.id;
    let scheduled = false;
    stop = h.house().bus.on(event => {
      if (!scheduled && event.kind === "act-result" && event.by === "luz") {
        scheduled = true;
        queueMicrotask(() => {
          void h.act("revoke-key", { key: id }, "identities/luz");
        });
      }
    });
    const response = await post(
      "/mcp",
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "actuar",
          arguments: { programa: "sales", accion: "register", datos: { sale: "revoked-http", total: 1500 } },
        },
      },
      key,
    );
    expect(response.status).toBe(401);
    expect(h.house().tools.state().tools.sales.has("revoked-http")).toBe(false);
  } finally {
    stop();
    if (server) await server.close();
    else await door.close();
    h.close();
  }
});
