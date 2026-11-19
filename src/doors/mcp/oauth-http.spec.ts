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
    expect(mcpRows(mcpResult(reading.body))).toMatchObject({ identidad: "beto" });
  } finally {
    await f.close();
  }
});
