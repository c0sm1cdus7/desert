import assert from "node:assert/strict";
import test from "node:test";
import { browserFixture } from "./fixture.ts";

test("HTTP gateway requires browser access, same origin, exact contract and closed request shapes", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    const cookie = (await f.context.cookies()).find(cookie => cookie.name === "desert-local")!;
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.sameSite, "Strict");
    assert.equal(await f.page.evaluate(() => document.cookie), "");
    assert.equal(f.page.url().includes("access="), false);
    const headers = { "Content-Type": "application/json", Origin: f.server.origin,
      Cookie: `${cookie.name}=${cookie.value}`, "X-Desert-Contract": f.application.digest };
    const post = (operation: string, data: unknown, overrides = {}) => fetch(`${f.server.origin}/api/${operation}`,
      { method: "POST", headers: { ...headers, ...overrides }, body: JSON.stringify(data) });
    assert.equal((await fetch(`${f.server.origin}/api/availability`)).status, 401);
    assert.equal((await post("begin", { journeyId: "create-note" }, { Origin: "https://evil.invalid" })).status, 403);
    assert.equal((await post("begin", { journeyId: "create-note" }, { "X-Desert-Contract": "different" })).status, 409);
    const forgedActor = await post("begin", { journeyId: "create-note", actor: "root" });
    assert.deepEqual(await forgedActor.json(), { error: "INVALID_REQUEST" });
    const run = await (await post("begin", { journeyId: "create-note" })).json();
    const forgedOwner = await post("prepare", { runId: run.id, input: { title: "Injected", body: "No", owner: "root" } });
    assert.deepEqual(await forgedOwner.json(), { error: "INVALID_INPUT" });
    const invitation = new URL(f.server.launchUrl).hash.slice("#access=".length);
    const reusedInvitation = await post("connect", { invitation });
    assert.equal(reusedInvitation.status, 401);
    assert.deepEqual(await reusedInvitation.json(), { error: "BROWSER_SESSION_REQUIRED" },
      "an already-consumed launch invitation never opens another browser session");
    assert.deepEqual(await f.session.read((await f.session.begin("read-note")).id), []);
    const html = await (await fetch(f.server.origin)).text();
    assert.equal(html.includes(f.identity.token), false);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
