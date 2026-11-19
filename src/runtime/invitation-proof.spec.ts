// Work stamps are code-bound, checked in constant space, and cannot be replaced with forged origin headers.
import { expect, it, vi } from "vitest";
import { invitationAttempts, solveInvitationProof, validInvitationProof } from "./invitation-proof.ts";
import { doorHouse, invitationCode } from "../../tests/support/door-house.ts";
it("requires work for each candidate and rejects malformed stamps", () => {
  const code = "ABCD-2345",
    proof = solveInvitationProof(code);
  expect(validInvitationProof(code, proof)).toBe(true);
  for (const invalid of [undefined, -1, 0.5, "1", Infinity, 0x1_0000_0000])
    expect(validInvitationProof(code, invalid)).toBe(false);
  expect(validInvitationProof("invalid", proof)).toBe(false);
});
it("never checks invitations for unproven guesses, caches proven misses and admits legitimate work", async () => {
  const h = doorHouse();
  try {
    const access = h.access();
    const redeem = vi.fn(access.redeem);
    const attemptCode = invitationAttempts(redeem, h.house().now);
    const code = invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"));
    for (let attempt = 0; attempt < 1000; attempt++) await attemptCode("2222-2222", undefined);
    expect(redeem).not.toHaveBeenCalled();
    const proof = solveInvitationProof("2222-2222");
    for (let attempt = 0; attempt < 50; attempt++) expect((await attemptCode("2222-2222", proof)).status).toBe(400);
    expect(redeem).toHaveBeenCalledTimes(1);
    expect((await attemptCode(code, solveInvitationProof(code))).status).toBe(200);
  } finally {
    vi.restoreAllMocks();
    h.close();
  }
});
