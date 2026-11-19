// Exercise fail-closed OAuth input boundaries, exact discovery and consent security without a network.
import { mcpDoor } from "./mcp-handler.ts";
import { deriveHostCredential } from "./host-credential.ts";
import { hkdfSync } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import { oauthHouse, oauthOrigin, responseField } from "../../../tests/support/oauth-house.ts";
import { solveInvitationProof } from "../../runtime/invitation-proof.ts";
const opened: Awaited<ReturnType<typeof oauthHouse>>[] = [];
const setup = async () => {
  const f = await oauthHouse();
  opened.push(f);
  return f;
};
afterEach(async () => {
  for (const f of opened.splice(0)) await f.close();
});
it("publishes exact metadata independent of Host and challenges both kinds of 401", async () => {
  const f = await setup();
  for (const path of ["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"]) {
    const response = await f.send("GET", path, "", { host: "forged.invalid" });
    expect(JSON.parse(response.body)).toEqual({
      resource: `${oauthOrigin}/mcp`,
      authorization_servers: [oauthOrigin],
      scopes_supported: ["house"],
      bearer_methods_supported: ["header"],
    });
  }
  expect(JSON.parse((await f.send("GET", "/.well-known/oauth-authorization-server")).body)).toEqual({
    issuer: oauthOrigin,
    authorization_endpoint: `${oauthOrigin}/authorize`,
    token_endpoint: `${oauthOrigin}/token`,
    registration_endpoint: `${oauthOrigin}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["house"],
  });
  const challenge = `Bearer resource_metadata="${oauthOrigin}/.well-known/oauth-protected-resource/mcp", scope="house"`;
  const missing = await f.send("POST", "/mcp");
  expect(missing.status).toBe(401);
  expect(f.field(missing.headers, "www-authenticate")).toBe(challenge);
  const invalid = await f.read("invalid");
  expect(invalid.status).toBe(401);
  expect(f.field(invalid.headers, "www-authenticate")).toBe(`${challenge}, error="invalid_token"`);
});
it("registers stateless public clients with bounded bodies, names and redirects", async () => {
  const f = await setup(),
    before = f.h.history();
  const valid = {
    redirect_uris: ["https://client.example/cb", "http://localhost:3000/cb", "http://127.0.0.1/cb"],
    token_endpoint_auth_method: "none",
  };
  const post = (value: unknown) =>
    f.send("POST", "/register", JSON.stringify(value), { "content-type": "application/json" });
  const response = await post(valid);
  expect(response.status).toBe(201);
  expect(responseField(response.body, "client_id").length).toBeGreaterThan(0);
  expect(JSON.parse(response.body)).toMatchObject({
    ...valid,
    grant_types: ["authorization_code"],
    response_types: ["code"],
  });
  for (const value of [
    {},
    { ...valid, token_endpoint_auth_method: "client_secret_basic" },
    { ...valid, redirect_uris: [] },
    { ...valid, client_name: "x".repeat(121) },
    ...[
      "http://remote.example/cb",
      "file:///tmp/cb",
      "https://client.example/cb#fragment",
      "https://user:password@client.example/cb",
      "http://localhost.evil/cb",
      "https://client.example/cb#",
    ].map(uri => ({ ...valid, redirect_uris: [uri] })),
    { ...valid, grant_types: ["refresh_token"] },
    { ...valid, response_types: ["token"] },
  ])
    expect((await post(value)).status).toBe(400);
  expect((await f.send("POST", "/register", "x".repeat(32769), { "content-type": "application/json" })).status).toBe(
    400,
  );
  expect(f.h.history() === before).toBe(true);
});
it.each(["client", "redirect", "duplicate"])("does not redirect an unsafe %s", async kind => {
  const f = await setup(),
    { authorization } = await f.params();
  if (kind === "client") authorization.set("client_id", `${authorization.get("client_id")}x`);
  if (kind === "redirect") authorization.set("redirect_uri", "https://evil.example/callback");
  if (kind === "duplicate") authorization.append("redirect_uri", "https://evil.example/callback");
  for (const response of [
    await f.send("GET", `/authorize?${authorization.toString()}`),
    await f.form("/authorize", authorization),
  ]) {
    expect(response.status).toBe(400);
    expect(f.field(response.headers, "location")).toBeUndefined();
    expect(response.body).not.toContain("evil.example");
    expect(response.body.includes(authorization.get("client_id") ?? "")).toBe(false);
  }
});
it.each([
  ["resource", "https://other.example/mcp"],
  ["resource", null],
  ["code_challenge_method", "plain"],
  ["code_challenge_method", null],
  ["code_challenge", null],
  ["code_challenge", "short"],
  ["scope", "other"],
  ["response_type", "token"],
])("redirects a validated client for invalid %s=%s and preserves state", async (name, value) => {
  const f = await setup(),
    { authorization } = await f.params();
  if (value === null) authorization.delete(name);
  else authorization.set(name, value);
  const response = await f.send("GET", `/authorize?${authorization.toString()}`);
  expect(response.status).toBe(302);
  const location = new URL(f.field(response.headers, "location") ?? "");
  expect(location.origin).toBe("https://client.example");
  expect(location.searchParams.has("error")).toBe(true);
  expect(location.searchParams.get("state")).toBe(authorization.get("state"));
  expect(location.searchParams.get("error_description")).not.toContain("https://other");
});
it("accepts absent scope, ignores only the loopback port and secures the escaped page", async () => {
  const f = await setup(),
    { authorization } = await f.params();
  authorization.delete("scope");
  authorization.set("client_id", await f.register("http://localhost:1200/cb", '<img src=x onerror="alert(1)">'));
  authorization.set("redirect_uri", "http://localhost:9999/cb");
  const page = await f.send("GET", `/authorize?${authorization.toString()}`, "", { host: "forged.invalid" });
  expect(page.status).toBe(200);
  expect(page.body).not.toContain("<img");
  expect(page.body).toContain("localhost:9999");
  expect(f.field(page.headers, "x-frame-options")).toBe("DENY");
  expect(f.field(page.headers, "referrer-policy")).toBe("no-referrer");
  expect(f.field(page.headers, "cache-control")).toBe("no-store");
  const nonce = page.body.match(/<script nonce="([A-Za-z0-9_-]+)">/)?.[1];
  expect(nonce).toBeTruthy();
  expect(f.field(page.headers, "content-security-policy")).toBe(
    `default-src 'none'; script-src 'nonce-${nonce}'; ` +
      "form-action 'self' http://localhost:9999; frame-ancestors 'none'; base-uri 'none'",
  );
  authorization.set("redirect_uri", "http://localhost:9999/a/../cb");
  expect((await f.send("GET", `/authorize?${authorization.toString()}`)).status).toBe(400);
});
it.each(["expired", "used"])("rejects an %s invitation without another key", async kind => {
  const f = await setup(),
    { authorization } = await f.params(),
    invitation = await f.invite();
  if (kind === "expired") f.h.advance(86_400_000);
  else expect((await f.consent(authorization, invitation)).status).toBe(302);
  const count = f.h.house().tools.state().house.doors.keys.size;
  const response = await f.consent(authorization, invitation);
  expect(response.status).toBe(kind === "used" ? 200 : 400);
  expect(response.body.includes(invitation)).toBe(false);
  expect(f.h.house().tools.state().house.doors.keys.size).toBe(count);
  if (response.status === 200) {
    const challenge = response.body.match(/name="challenge" value="([A-Za-z0-9_-]+)"/)?.[1] ?? "";
    authorization.set("challenge", challenge);
    expect((await f.consent(authorization, invitation, solveInvitationProof(invitation, challenge))).status).toBe(400);
  }
});
it("shares the audited attempt budget with direct redemption and recovers after a minute", async () => {
  const f = await setup(),
    { authorization } = await f.params();
  for (let attempt = 0; attempt < 10; attempt++)
    expect((await f.h.access().attempt("bad", undefined)).status).toBe(400);
  const denied = await f.consent(authorization, "bad", 0);
  expect(denied.status).toBe(429);
  expect(denied.body.includes(authorization.get("client_id") ?? "")).toBe(false);
  expect(f.field(denied.headers, "retry-after")).toBe("60");
  f.h.advance(60_000);
  expect((await f.consent(authorization, "bad", 0)).status).toBe(400);
});
it("reports RFC token errors without echoing submitted secrets", async () => {
  const f = await setup(),
    g = await f.grant();
  for (const [name, value, error] of [
    ["grant_type", "refresh_token", "unsupported_grant_type"],
    ["client_id", "tampered", "invalid_client"],
    ["resource", "", "invalid_request"],
    ["code_verifier", "", "invalid_request"],
  ]) {
    if (!name || value === undefined || !error) throw new Error("Missing test case");
    const params = new URLSearchParams(g.token);
    params.set(name, value);
    const response = await f.form("/token", params);
    expect(responseField(response.body, "error")).toBe(error);
    expect(response.body.includes(g.code)).toBe(false);
  }
});

it("rejects noncanonical signature encodings even when their decoded bytes match", async () => {
  const f = await setup(),
    { authorization } = await f.params();
  const client = authorization.get("client_id") ?? "";
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const last = alphabet.indexOf(client.slice(-1));
  authorization.set("client_id", client.slice(0, -1) + alphabet.charAt(last ^ 1));
  const response = await f.send("GET", `/authorize?${authorization.toString()}`);
  expect(response.status).toBe(400);
  expect(f.field(response.headers, "location")).toBeUndefined();
});
it("requires an explicit HTTPS origin and root bytes, and derives the specified host HKDF", async () => {
  const f = await setup();
  for (const origin of [
    "https://house.example/",
    "http://house.example",
    "https://house.example/path",
    "https://user:password@house.example",
    "https://house.example?query",
    "https://house.example#fragment",
  ])
    expect(() => mcpDoor(f.h.house(), { ...f.options, oauth: { origin } })).toThrow();
  expect(() =>
    mcpDoor(f.h.house(), { name: "test", version: "1", limits: { recentLines: 20 }, oauth: { origin: oauthOrigin } }),
  ).toThrow();
  expect(() => deriveHostCredential(new Uint8Array(31))).toThrow();
  const expected = Buffer.from(hkdfSync("sha256", f.rootKey, "", "desert/door/host/v1", 32)).toString("base64url");
  expect(deriveHostCredential(f.rootKey) === expected).toBe(true);
});
