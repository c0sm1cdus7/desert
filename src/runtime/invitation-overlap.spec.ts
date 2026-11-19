// A bounded wave of real, proven guesses must overlap a completed independent redemption, including HTTP.
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { doorHouse, invitationCode, rpcRequest } from "../../tests/support/door-house.ts";
import { isRecord } from "../fields/json-values.ts";
import { serveMcp } from "../doors/mcp/mcp-http.ts";
import { solveInvitationProof, validInvitationProof } from "./invitation-proof.ts";
import { responseField } from "../../tests/support/oauth-house.ts";
function work() {
  const rows: unknown = JSON.parse(
    readFileSync(new URL("../../tests/support/invitation-work.json", import.meta.url), "utf8"),
  );
  if (!Array.isArray(rows)) throw new Error("Missing proven attempts");
  return rows.slice(0, 64).map((row: unknown) => {
    if (!isRecord(row) || typeof row.code !== "string" || typeof row.proof !== "number")
      throw new Error("Invalid proven attempt");
    expect(validInvitationProof(row.code, row.proof)).toBe(true);
    return { code: row.code, proof: row.proof };
  });
}
for (const http of [false, true])
  it(`${http ? "HTTP" : "handler"}: finishes a legitimate redemption before the proven attempts stop`, async () => {
    const h = doorHouse(),
      door = h.door();
    let server: Awaited<ReturnType<typeof serveMcp>> | undefined;
    let background: Promise<void> | undefined;
    let stopping = false;
    try {
      const code = invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"));
      // Guesses check three real invitations; the independent valid code matches the first.
      for (let i = 0; i < 2; i++) await h.act("invite", { door: "agent" }, "identities/beto");
      const proof = solveInvitationProof(code),
        candidates = work();
      if (http) server = await serveMcp(door, { host: "127.0.0.1", port: 0 });
      const address = server?.address;
      const base = address && typeof address !== "string" ? `http://127.0.0.1:${address.port}` : "";
      const send = async (body: unknown) => {
        const request = {
          method: "POST",
          path: "/door/invitations/redeem",
          headers: { "content-type": "application/json" },
          body: () => [Buffer.from(JSON.stringify(body))],
        };
        if (!http) return door.handle(request);
        const response = await fetch(`${base}${request.path}`, {
          method: "POST",
          headers: request.headers,
          body: JSON.stringify(body),
        });
        return { status: response.status, body: await response.text() };
      };
      let next = 0,
        completed = 0,
        inFlight = 0;
      const statuses: number[] = [];
      const attempt = async () => {
        const pair = candidates[next++];
        if (!pair) throw new Error("Exhausted bounded work");
        inFlight++;
        try {
          const result = await send(pair);
          statuses.push(result.status);
          expect(result.status).toBe(400);
          completed++;
        } finally {
          inFlight--;
        }
      };
      // Start at capacity, then leave five slots free while three workers keep verifying new guesses.
      const initial = Array.from({ length: 8 }, () => attempt());
      background = Promise.all(initial).then(async () => {
        await Promise.all(
          Array.from({ length: 3 }, async () => {
            while (!stopping && next < candidates.length) await attempt();
          }),
        );
      });
      const recoveries: number[] = [];
      let challenge = "stale-challenge";
      let result = await send({ code, proof, challenge });
      for (let retry = 0; result.status !== 200 && retry < 40; retry++) {
        recoveries.push(result.status);
        if (result.status === 428) challenge = responseField(result.body, "challenge");
        else {
          expect(result.status).toBe(503);
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        result = await send({ code, challenge, proof: challenge ? solveInvitationProof(code, challenge) : proof });
      }
      expect(result.status).toBe(200);
      expect(recoveries).toContain(428);
      expect(recoveries).toContain(503);
      const atRedemption = completed;
      expect(atRedemption).toBeGreaterThan(0);
      expect(atRedemption).toBeLessThan(candidates.length);
      expect(inFlight).toBeGreaterThan(0);
      const key = responseField(result.body, "key");
      const request = rpcRequest(key);
      const entered = http
        ? await fetch(`${base}/mcp`, {
            method: "POST",
            headers: request.headers,
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
          })
        : await door.handle(request);
      expect(entered.status).toBe(200);
      // Do not stop the wave at redemption: observe at least one later real verification completing.
      for (let tick = 0; completed === atRedemption && tick < 200; tick++)
        await new Promise(resolve => setTimeout(resolve, 10));
      expect(completed).toBeGreaterThan(atRedemption);
      stopping = true;
      await background;
      expect(statuses.every(status => status === 400)).toBe(true);
      expect(next).toBeLessThanOrEqual(64);
    } finally {
      stopping = true;
      await background;
      await server?.close();
      await door.close();
      h.close();
    }
  }, 20000);
