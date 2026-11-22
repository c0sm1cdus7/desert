// Check the browser proof, transport reauthorization and host terminal path at the credential boundaries.
import { afterEach, expect, it, vi } from "vitest";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { oauthHouse, responseField } from "../../../tests/support/oauth-house.ts";
import { validInvitationProof } from "../../runtime/invitation-proof.ts";
import { deriveHostCredential } from "./host-credential.ts";
import { httpDoorFetch } from "../../../tests/support/http-door-fetch.ts";
import { connectRemoteTerminal } from "../terminal/remote-terminal-client.ts";
import type { Shop } from "../../../tests/support/shop.ts";
const opened: Awaited<ReturnType<typeof oauthHouse>>[] = [];
const setup = async () => {
  const f = await oauthHouse();
  opened.push(f);
  return f;
};
afterEach(async () => {
  for (const f of opened.splice(0)) await f.close();
  vi.restoreAllMocks();
});
it("runs the exact nonce script in the consent page and submits a valid audited proof", async () => {
  const f = await setup(),
    { authorization } = await f.params(),
    invitation = await f.invite();
  const page = await f.send("GET", `/authorize?${authorization.toString()}`);
  const script = page.body.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)?.[1];
  if (!script) throw new Error("Missing proof script");
  const button = { disabled: false, textContent: "" },
    output = { value: "" };
  const preventDefault = vi.fn(),
    submit = vi.fn();
  let listener: ((event: { preventDefault: () => void }) => Promise<void>) | undefined;
  const form = {
    querySelector: (name: string) => (name === "button" ? button : output),
    addEventListener: (_name: string, callback: typeof listener) => {
      listener = callback;
    },
  };
  const data = new Map([
    ["invitation", invitation],
    ["challenge", ""],
  ]);
  const browser = {
    document: { querySelector: () => form },
    HTMLFormElement: { prototype: { submit } },
    FormData: class ProofForm {
      get(name: string) {
        return data.get(name) ?? null;
      }
    },
    crypto: webcrypto,
    TextEncoder,
    Uint8Array,
  };
  runInNewContext(script, browser, { timeout: 1000 });
  if (!listener) throw new Error("Missing proof listener");
  await listener({ preventDefault });
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(submit).toHaveBeenCalledOnce();
  expect(validInvitationProof(invitation, Number(output.value))).toBe(true);
  expect((await f.consent(authorization, invitation, Number(output.value))).status).toBe(302);
}, 20_000);
it("keeps the OAuth challenge on a credential revoked while the request body is arriving", async () => {
  const f = await setup(),
    g = await f.grant();
  const token = responseField((await f.form("/token", g.token)).body, "access_token");
  const request = {
    method: "POST",
    path: "/mcp",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: async function* () {
      await f.h.act("revoke-key", { key: g.key.id }, "identities/beto");
      yield Buffer.from(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }));
    },
  };
  const response = await f.door.handle(request);
  expect(response.status).toBe(401);
  expect(f.field(response.headers, "www-authenticate")).toContain('error="invalid_token"');
  expect(f.field(response.headers, "www-authenticate")).toContain('/.well-known/oauth-protected-resource/mcp"');
});
it("keeps the OAuth challenge when an open wait is revoked", async () => {
  const f = await setup(),
    g = await f.grant();
  const token = responseField((await f.form("/token", g.token)).body, "access_token");
  const waiting = f.send(
    "POST",
    "/mcp",
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "wait", arguments: { since: f.h.house().tools.state().through, seconds: 60 } },
    }),
    { "content-type": "application/json", authorization: `Bearer ${token}` },
  );
  await new Promise<void>(resolve => setImmediate(resolve));
  await f.h.act("revoke-key", { key: g.key.id }, "identities/beto");
  const response = await waiting;
  expect(response.status).toBe(401);
  expect(f.field(response.headers, "www-authenticate")).toContain('error="invalid_token"');
});
it("admits the derived host credential to the remote terminal and redacts its writes and diagnostics", async () => {
  const f = await setup(),
    credential = deriveHostCredential(f.rootKey);
  const transport = httpDoorFetch(f.door.handle);
  const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  const client = await connectRemoteTerminal<Shop>("http://localhost/mcp", credential, transport.send);
  try {
    expect(client.identity()).toBe("ana");
    client.send({
      type: "act",
      id: "host-scene",
      act: "scene",
      input: { general: `prefix${credential}suffix` },
      through: 0,
    });
    await vi.waitFor(() => expect(client.state().house.scenes.get("ana")?.data.general).toContain("[secreto]"));
    expect(f.h.history().includes(credential)).toBe(false);
    expect(JSON.stringify(stderr.mock.calls).includes(credential)).toBe(false);
  } finally {
    client.close();
    transport.disconnect();
  }
});
