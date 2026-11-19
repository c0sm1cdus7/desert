// The auditor's 257 reusable proofs cannot evict replay protection or block the shared process with scrypt.
import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { invitationAttempts, solveInvitationProof } from "./invitation-proof.ts";
import { doorHouse, invitationCode, rpcRequest } from "../../tests/support/door-house.ts";
import { isRecord } from "../fields/json-values.ts";
import { serveMcp } from "../doors/mcp/mcp-http.ts";
function candidates() {
  const value: unknown = JSON.parse(
    readFileSync(new URL("../../tests/support/invitation-work.json", import.meta.url), "utf8"),
  );
  if (!Array.isArray(value)) throw new Error("Invalid fixture");
  return value.map((pair: unknown) => {
    if (!isRecord(pair) || typeof pair.code !== "string" || typeof pair.proof !== "number")
      throw new Error("Invalid fixture pair");
    return { code: pair.code, proof: pair.proof };
  });
}
it("requires new work after the bounded replay window fills instead of accepting the same ring again", async () => {
  const redeem = vi.fn(() => ({ status: 400 }));
  const attempts = invitationAttempts(redeem, () => 0);
  for (const pair of candidates()) await attempts(pair.code, pair.proof);
  expect(redeem).toHaveBeenCalledTimes(256);
  for (const pair of candidates()) expect((await attempts(pair.code, pair.proof)).status).toBe(428);
  expect(redeem).toHaveBeenCalledTimes(256);
  const challenge = (await attempts("ABCD-2345", 0)).challenge;
  expect(challenge).toBeTruthy();
  await attempts("ABCD-2345", solveInvitationProof("ABCD-2345", challenge), challenge);
  expect(redeem).toHaveBeenCalledTimes(257);
});
for (const network of [false, true])
  it(`${network ? "http" : "handler"}: serves legitimate traffic during repeated proven abuse`, async () => {
    const h = doorHouse(),
      door = h.door();
    let server: Awaited<ReturnType<typeof serveMcp>> | undefined;
    try {
      const codes: string[] = [];
      for (let i = 0; i < 3; i++)
        codes.push(invitationCode(await h.act("invite", { door: "agent" }, "identities/beto")));
      if (network) server = await serveMcp(door, { host: "127.0.0.1", port: 0 });
      const address = server?.address;
      const url = address && typeof address !== "string" ? `http://127.0.0.1:${address.port}` : "";
      const send = async (body: unknown) => {
        const request = {
          method: "POST",
          path: "/door/invitations/redeem",
          headers: { "content-type": "application/json" },
          body: () => [Buffer.from(JSON.stringify(body))],
        };
        if (!network) return door.handle(request);
        const response = await fetch(`${url}${request.path}`, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(body),
        });
        return { status: response.status, body: await response.text() };
      };
      for (let round = 0; round < 2; round++) {
        let ticked = false;
        const started = performance.now();
        const timer = new Promise<void>(done =>
          setTimeout(() => {
            ticked = true;
            done();
          }, 0),
        );
        const wave = Promise.all(candidates().map(pair => send(pair)));
        const ping = network
          ? await fetch(`${url}/mcp`, {
              method: "POST",
              headers: rpcRequest(h.founder).headers,
              body: JSON.stringify({ jsonrpc: "2.0", id: "concurrent", method: "ping" }),
            })
          : await door.handle(rpcRequest(h.founder));
        expect(ping.status).toBe(200);
        await timer;
        expect(ticked).toBe(true);
        expect(performance.now() - started).toBeLessThan(1500);
        const results = await wave;
        expect(results.every(result => [400, 428, 503].includes(result.status))).toBe(true);
      }
      const code = codes[0];
      if (!code) throw new Error("Missing code");
      let challenge = "";
      let result = await send({ code, proof: solveInvitationProof(code) });
      if (result.status === 428) {
        const value: unknown = JSON.parse(result.body);
        if (!isRecord(value) || typeof value.challenge !== "string") throw new Error("Missing challenge");
        challenge = value.challenge;
        result = await send({ code, challenge, proof: solveInvitationProof(code, challenge) });
      }
      expect(result.status).toBe(200);
    } finally {
      await server?.close();
      await door.close();
      h.close();
    }
  }, 20000);
