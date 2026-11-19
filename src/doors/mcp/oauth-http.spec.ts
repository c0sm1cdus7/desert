// A real HTTP transport follows discovery, DCR, browser consent, PKCE and authenticated MCP reading.
import { expect, it } from "vitest";
import { oauthHouse, oauthOrigin, responseField } from "../../../tests/support/oauth-house.ts";
import { mcpRows, mcpResult } from "../../../tests/support/mcp-results.ts";
it("enters the invited house through HTTP with OAuth and a forged Host", async () => {
  const f = await oauthHouse(true);
  try {
    const { authorization, verifier } = await f.params();
    const page = await f.send("GET", `/authorize?${authorization.toString()}`, "", { host: "forged.invalid" });
    expect(page.status).toBe(200);
    expect(page.body).toContain("Cliente de prueba");
    expect(page.body).toContain("client.example");
    expect(page.body).not.toContain("forged.invalid");
    const invitation = await f.invite();
    const result = await f.consent(authorization, invitation);
    expect(result.status).toBe(302);
    const redirect = new URL(f.field(result.headers, "location") ?? "");
    expect(redirect.origin).toBe("https://client.example");
    expect(redirect.searchParams.get("state")).toBe(authorization.get("state"));
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code: redirect.searchParams.get("code") ?? "",
      client_id: authorization.get("client_id") ?? "",
      redirect_uri: authorization.get("redirect_uri") ?? "",
      resource: `${oauthOrigin}/mcp`,
      code_verifier: verifier,
    });
    const token = await f.form("/token", params);
    expect(token.status).toBe(200);
    const reading = await f.read(responseField(token.body, "access_token"));
    expect(mcpRows(mcpResult(reading.body))).toMatchObject({ identity: "beto" });
  } finally {
    await f.close();
  }
});

for (const http of [false, true]) {
  it(`maximum registration fits authorization and Node headers (${http ? "HTTP" : "handler"})`, async () => {
    const f = await oauthHouse(http);
    try {
      const { authorization } = await f.params();
      const redirects = Array.from({ length: 3 }, (_, i) => `https://client.example/${i}/`.padEnd(1024, "!"));
      const response = await f.send(
        "POST",
        "/register",
        JSON.stringify({
          redirect_uris: redirects,
          client_name: "x".repeat(120),
          token_endpoint_auth_method: "none",
        }),
        { "content-type": "application/json" },
      );
      expect(response.status).toBe(201);
      authorization.set("client_id", responseField(response.body, "client_id"));
      authorization.set("redirect_uri", redirects[0] ?? "");
      authorization.set("state", "s".repeat(2048));
      const path = `/authorize?${authorization.toString()}`;
      expect(Buffer.byteLength(path)).toBeLessThan(12 * 1024);
      const page = await f.send("GET", path);
      expect(page.status).toBe(200);
      expect(page.body).toContain("x".repeat(120));
    } finally {
      await f.close();
    }
  });

  it(`oversized metadata gets a useful OAuth error (${http ? "HTTP" : "handler"})`, async () => {
    const f = await oauthHouse(http);
    try {
      const valid = {
        redirect_uris: ["https://client.example/cb"],
        client_name: "Cliente",
        token_endpoint_auth_method: "none",
      };
      for (const value of [
        { ...valid, redirect_uris: Array.from({ length: 4 }, (_, i) => `https://client.example/${i}`) },
        { ...valid, redirect_uris: ["https://client.example/".padEnd(1025, "x")] },
        { ...valid, client_name: "x".repeat(121) },
        { ...valid, client_name: "ñ".repeat(61) },
        { ...valid, client_name: "\u0000".repeat(21) },
        { ...valid, redirect_uris: ["https://client.example/" + "ñ".repeat(512)] },
      ]) {
        const response = await f.send("POST", "/register", JSON.stringify(value), {
          "content-type": "application/json",
        });
        expect(response.status).toBe(400);
        expect(responseField(response.body, "error")).toBe("invalid_client_metadata");
        expect(responseField(response.body, "error_description")).toContain("1024");
      }
    } finally {
      await f.close();
    }
  });

  it(`IPv6 loopback ignores only the port (${http ? "HTTP" : "handler"})`, async () => {
    const f = await oauthHouse(http);
    try {
      const { authorization } = await f.params();
      authorization.set("client_id", await f.register("http://[::1]:1200/cb"));
      for (const [redirect, status] of [
        ["http://[::1]:9999/cb", 200],
        ["http://[::2]:9999/cb", 400],
        ["http://[::1]:9999/other", 400],
      ] as const) {
        authorization.set("redirect_uri", redirect);
        expect((await f.send("GET", `/authorize?${authorization.toString()}`)).status).toBe(status);
      }
    } finally {
      await f.close();
    }
  });
}
