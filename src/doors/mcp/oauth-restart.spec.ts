// A house restart loses pending bearers, but durable code digests preserve replay revocation.
import { afterEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { oauthHouse, responseField } from "../../../tests/support/oauth-house.ts";
const opened: Awaited<ReturnType<typeof oauthHouse>>[] = [];
afterEach(async () => {
  for (const f of opened.splice(0)) await f.close();
  vi.useRealTimers();
});
for (const withoutDoorClose of [false, true]) {
  const closing = withoutDoorClose ? "house close without door close" : "orderly";
  it(`${closing} restart revokes undelivered codes before any door`, async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const f = await oauthHouse();
    opened.push(f);
    const g = await f.grant();
    const fingerprint = createHash("sha256").update(g.code).digest("hex");
    expect(f.h.house().tools.state().house.doors.codes.get(fingerprint)).toEqual({
      fingerprint,
      key: g.key.id,
      delivered: false,
    });
    if (!withoutDoorClose) await f.door.close();
    f.h.reopen();
    // This fixture closes the house; real process death is covered in oauth-process-death.spec.ts.
    vi.clearAllTimers();
    expect(f.h.house().tools.state().house.doors.keys.get(g.key.id)?.revoked).toBe(true);
    // Recompose only after checking the house itself performed recovery.
    const { mcpDoor } = await import("./mcp-handler.ts");
    f.door = mcpDoor(f.h.house(), f.options);
    expect(responseField((await f.form("/token", g.token)).body, "error")).toBe("invalid_grant");
    expect(f.h.history().includes(g.code)).toBe(false);
  });
  it(`${closing} restart keeps delivered keys until replay revokes them`, async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const f = await oauthHouse();
    opened.push(f);
    const g = await f.grant();
    const token = responseField((await f.form("/token", g.token)).body, "access_token");
    const fingerprint = createHash("sha256").update(g.code).digest("hex");
    expect(f.h.house().tools.state().house.doors.codes.get(fingerprint)?.delivered).toBe(true);
    await f.reopen(withoutDoorClose);
    vi.clearAllTimers();
    expect((await f.read(token)).status).toBe(200);
    const invalid = new URLSearchParams(g.token);
    for (const code of ["!", "short", "ñ".repeat(43), "x".repeat(43)]) {
      invalid.set("code", code);
      expect(responseField((await f.form("/token", invalid)).body, "error")).toBe("invalid_grant");
      expect((await f.read(token)).status).toBe(200);
    }
    expect(responseField((await f.form("/token", g.token)).body, "error")).toBe("invalid_grant");
    expect((await f.read(token)).status).toBe(401);
    await f.reopen();
    expect((await f.read(token)).status).toBe(401);
    for (const material of [g.code, token, g.invitation]) expect(f.h.history().includes(material)).toBe(false);
  });
}

it("does not release a code if recording its digest fails", async () => {
  const f = await oauthHouse();
  opened.push(f);
  const { authorization } = await f.params(),
    invitation = await f.invite();
  const stop = f.h.house().bus.on("door-oauth-issued", () => {
    throw new Error("Synthetic journal failure");
  });
  try {
    const response = await f.consent(authorization, invitation);
    expect(response.status).toBe(503);
    expect(f.field(response.headers, "location")).toBeUndefined();
    expect(f.h.house().tools.state().house.doors.codes.size).toBe(0);
    const keys = [...f.h.house().tools.state().house.doors.keys.values()].filter(key => key.identity === "beto");
    expect(keys).toHaveLength(1);
    expect(keys.every(key => key.revoked)).toBe(true);
  } finally {
    stop();
  }
});

it("does not release a bearer if recording delivery fails and recovers it as undelivered", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const f = await oauthHouse();
  opened.push(f);
  const g = await f.grant();
  const stop = f.h.house().bus.on("door-oauth-delivered", () => {
    throw new Error("Synthetic journal failure");
  });
  try {
    await expect(f.form("/token", g.token)).rejects.toThrow();
    expect([...f.h.house().tools.state().house.doors.codes.values()].every(code => !code.delivered)).toBe(true);
  } finally {
    stop();
  }
  await f.reopen(true);
  vi.clearAllTimers();
  expect(f.h.house().tools.state().house.doors.keys.get(g.key.id)?.revoked).toBe(true);
});
