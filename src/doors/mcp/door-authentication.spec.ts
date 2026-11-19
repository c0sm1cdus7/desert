// Authenticate and redeem through the live journal adapter, including malformed input and candidate retries.
import { expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { doorHouse, invitationCode, rpcRequest } from "../../../tests/support/door-house.ts";
import { solveInvitationProof } from "../../runtime/invitation-proof.ts";
import { responseField } from "../../../tests/support/oauth-house.ts";

it("compares ordinary credentials on the MCP path and rejects malformed bearer headers", async () => {
  const h = doorHouse(),
    door = h.door();
  try {
    for (const material of [
      h.founder,
      randomBytes(32).toString("base64url"),
      "x",
      "ñ".repeat(43),
      "",
      `${h.founder} extra`,
    ])
      expect((await door.handle(rpcRequest(material))).status).toBe(material === h.founder ? 200 : 401);
    const request = rpcRequest(h.founder);
    expect(
      (await door.handle({ ...request, headers: { ...request.headers, Authorization: request.headers.authorization } }))
        .status,
    ).toBe(401);
  } finally {
    await door.close();
    h.close();
  }
});

it("checks invitation fingerprints and candidate recovery through the actual redemption handler", async () => {
  const h = doorHouse(),
    door = h.door();
  const send = async (code: string, key?: string, challenge = "") =>
    door.handle({
      method: "POST",
      path: "/door/invitations/redeem",
      headers: { "content-type": "application/json" },
      body: () => [Buffer.from(JSON.stringify({ code, key, challenge, proof: solveInvitationProof(code, challenge) }))],
    });
  try {
    const code = invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"));
    const key = randomBytes(32).toString("base64url");
    for (const invalid of ["2345-6789", "bad", "", "ñ".repeat(9)]) expect((await send(invalid, key)).status).toBe(400);
    expect((await send(code, key)).status).toBe(200);
    let challenge = "";
    for (const candidate of [key, randomBytes(32).toString("base64url"), "short", "!".repeat(43)]) {
      let result = await send(code, candidate, challenge);
      if (result.status === 428) {
        challenge = responseField(result.body, "challenge");
        result = await send(code, candidate, challenge);
      }
      expect(result.status).toBe(candidate === key ? 200 : 400);
    }
    expect((await door.handle(rpcRequest(key))).status).toBe(200);
  } finally {
    await door.close();
    h.close();
  }
});

it("checks the synchronous invitation and recovered-key fingerprints too", async () => {
  const h = doorHouse();
  try {
    const code = invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"));
    const key = randomBytes(32).toString("base64url");
    for (const invalid of ["2345-6789", "bad", ""]) expect(h.access().redeem(invalid, key).status).toBe(400);
    expect(h.access().redeem(code, key).status).toBe(200);
    expect(h.access().redeem(code, key).status).toBe(200);
    expect(h.access().redeem(code, randomBytes(32).toString("base64url")).status).toBe(400);
    expect(h.access().redeem(code, "short").status).toBe(400);
  } finally {
    h.close();
  }
});
