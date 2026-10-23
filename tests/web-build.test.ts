import assert from "node:assert/strict";
import test from "node:test";
import { compile, composeProduct } from "../src/index.ts";
import { buildHumanModule } from "../src/web/build.ts";
import { authoredNotebookSource } from "./fixtures/authored-notebook.ts";
import { localBrowserAccess } from "../src/web/access.ts";

test("standalone browser validation follows the contract without a second schema or runtime compiler", async () => {
  const source = authoredNotebookSource();
  const note = source.objects[0]!;
  const application = compile(composeProduct({ ...source, objects: [{ ...note,
    facts: { ...note.facts, title: { ...note.facts.title, maxLength: 2 } } }] }));
  const code = await buildHumanModule(application, "human");
  assert.doesNotMatch(code, /new Function|node:crypto/);
  const browser = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  const command = application.surface("human").journeys.find(journey => journey.id === "create-note")!;
  assert.ok(command.kind === "mutation");
  for (const input of [{ title: "💡", body: "Idea" }, { title: "ab", body: "OK" },
    { title: "abc", body: "Too long" }, { title: "", body: "Empty" }, { title: "ok" },
    { title: "ok", body: "x", owner: "intruder" }, { title: 1, body: "x" }]) {
    assert.equal(browser.validateInput(command.commandId, input), application.validateInput(command.commandId, input).valid);
  }
  assert.equal(browser.surface.contractDigest, application.digest);
  assert.equal(Object.isFrozen(browser.surface.journeys), true);
  assert.throws(() => browser.validateInput("unknown", {}), /Unknown command/);
  let getterCalls = 0;
  assert.equal(browser.validateInput(command.commandId, { get title() { getterCalls++; return "x"; }, body: "x" }), false);
  assert.equal(getterCalls, 0);
  await assert.rejects(buildHumanModule(application, "agent"), /HUMAN_SURFACE_REQUIRED/);
});

test("browser invitations are single-use and malformed Unicode cannot crash authentication", () => {
  const access = localBrowserAccess();
  assert.throws(() => access.connect("é".repeat(access.invitation!.length)), /BROWSER_SESSION_REQUIRED/);
  const cookie = access.connect(access.invitation);
  assert.equal(access.authenticated(cookie.split(";")[0]), true);
  assert.match(cookie, /HttpOnly; SameSite=Strict/);
  assert.throws(() => access.connect(access.invitation), /BROWSER_SESSION_REQUIRED/);
});
