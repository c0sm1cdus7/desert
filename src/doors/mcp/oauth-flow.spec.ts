// OAuth grants remain ordinary revocable house keys across consent, exchange, replay and expiry.
import { afterEach, expect, it, vi } from "vitest";
import { deriveHostCredential } from "./host-credential.ts";
import { randomBytes } from "node:crypto";
import { oauthHouse, responseField } from "../../../tests/support/oauth-house.ts";
import { mcpRows, mcpResult } from "../../../tests/support/mcp-results.ts";
const opened: Awaited<ReturnType<typeof oauthHouse>>[] = [];
const setup = async () => {
  const h = await oauthHouse();
  opened.push(h);
  return h;
};
afterEach(async () => {
  vi.useRealTimers();
  for (const h of opened.splice(0)) await h.close();
});
it("exchanges consent once, reads as the invited identity and honors Identidades revocation", async () => {
  const f = await setup(),
    g = await f.grant();
  const response = await f.form("/token", g.token);
  expect(response.status).toBe(200);
  expect(f.field(response.headers, "cache-control")).toBe("no-store");
  const token = responseField(response.body, "access_token");
  const parsed: unknown = JSON.parse(response.body);
  expect(parsed).toEqual({ access_token: token, scope: "house", token_type: "Bearer" });
  expect(mcpRows(mcpResult((await f.read(token)).body))).toMatchObject({ identity: "beto" });
  expect((await f.h.act("revoke-key", { key: g.key.id }, "identities/beto")).status).toBe("accepted");
  expect((await f.read(token)).status).toBe(401);
  for (const secret of [token, g.code, g.invitation, g.authorization.get("client_id") ?? ""])
    expect(f.h.history().includes(secret)).toBe(false);
});
it("rejects code replay and immediately revokes the bearer", async () => {
  const f = await setup(),
    g = await f.grant();
  const token = responseField((await f.form("/token", g.token)).body, "access_token");
  expect(responseField((await f.form("/token", g.token)).body, "error")).toBe("invalid_grant");
  expect((await f.read(token)).status).toBe(401);
  expect(f.h.house().tools.state().house.doors.keys.get(g.key.id)?.revoked).toBe(true);
});
it.each(["verifier", "redirect", "resource", "client"])("binds the grant to %s", async kind => {
  const f = await setup(),
    g = await f.grant();
  const changed = new URLSearchParams(g.token);
  const names: Record<string, string> = {
    verifier: "code_verifier",
    redirect: "redirect_uri",
    resource: "resource",
    client: "client_id",
  };
  changed.set(names[kind] ?? "", kind === "client" ? await f.register("https://other.example/cb") : "wrong");
  const response = await f.form("/token", changed);
  expect(response.status).toBe(400);
  expect(responseField(response.body, "error")).toBe("invalid_grant");
  expect(f.h.house().tools.state().house.doors.keys.get(g.key.id)?.revoked).toBe(true);
  expect(response.body.includes(g.code)).toBe(false);
});
it("revokes an expired code even without a token request", async () => {
  const f = await setup();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const g = await f.grant();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(f.h.house().tools.state().house.doors.keys.get(g.key.id)?.revoked).toBe(true);
  expect(responseField((await f.form("/token", g.token)).body, "error")).toBe("invalid_grant");
});
it("also checks the expiry at exchange and revokes pending keys at close", async () => {
  const f = await setup(),
    g = await f.grant();
  f.h.advance(60_000);
  expect(responseField((await f.form("/token", g.token)).body, "error")).toBe("invalid_grant");
  expect(f.h.house().tools.state().house.doors.keys.get(g.key.id)?.revoked).toBe(true);
  const next = await f.grant();
  await f.door.close();
  expect(f.h.house().tools.state().house.doors.keys.get(next.key.id)?.revoked).toBe(true);
});
it("derives the host as the actual admin without journal writes, redacts it and preserves legacy headers", async () => {
  const f = await setup(),
    before = f.h.history();
  const credential = deriveHostCredential(f.rootKey);
  expect((await f.read(credential)).status).toBe(200);
  expect(mcpRows(mcpResult((await f.read(credential)).body))).toMatchObject({ identity: "ana" });
  expect(f.h.history() === before).toBe(true);
  expect((await f.read(deriveHostCredential(randomBytes(32)))).status).toBe(401);
  expect((await f.read(f.h.founder)).status).toBe(200);
  expect(
    f.h.house().tools.act({ act: "scene", input: { general: `prefix${credential}suffix` } }, 0, "ana").status,
  ).toBe("accepted");
  expect(f.h.history().includes(credential)).toBe(false);
  const reading = await f.read(credential);
  expect(reading.body.includes(credential)).toBe(false);
  expect(reading.body).toContain("[secret]");
});

it("rejects a well-formed but incorrect PKCE verifier with the same grant revocation", async () => {
  const f = await setup(),
    g = await f.grant();
  g.token.set("code_verifier", "x".repeat(43));
  expect(responseField((await f.form("/token", g.token)).body, "error")).toBe("invalid_grant");
  expect(f.h.house().tools.state().house.doors.keys.get(g.key.id)?.revoked).toBe(true);
});
