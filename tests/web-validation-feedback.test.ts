import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { buildHumanModule } from "../src/web/build.ts";
import { Notebook } from "../products/notebook/product.ts";

test("standalone validation retains immutable field issues with exact canonical limits", async () => {
  const definition = structuredClone(Notebook);
  Object.assign(definition.objects[0]!.facts.title, { minLength: 2, maxLength: 3 });
  const application = compile(definition);
  const code = await buildHumanModule(application, "human");
  const browser = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  const command = application.surface("human").journeys.find(journey => journey.kind === "mutation" && !journey.subject)!;
  assert.equal(command.kind, "mutation");
  assert.equal(typeof browser.validateInput.inspect, "function", "boolean eligibility must retain field explanations");
  const invalid = browser.validateInput.inspect(command.commandId, { title: "a", body: "x" });
  assert.deepEqual(invalid, { valid: false, issues: [
    { keyword: "minLength", instancePath: "/title", schemaPath: "#/properties/title/minLength", params: { limit: 2 } },
  ] });
  assert.ok(Object.isFrozen(invalid.issues[0]!.params));
  for (const input of [{ title: "💡💡", body: "x" }, { title: "abcd", body: "x" }, { body: "x" },
    { title: "ok", body: "x", extra: true }, { title: 12, body: "x" }]) {
    assert.deepEqual(browser.validateInput.inspect(command.commandId, input), application.validateInput(command.commandId, input));
  }
  assert.equal(invalid.issues[0]!.keyword, "minLength", "later validations cannot overwrite retained explanations");
  let calls = 0;
  assert.deepEqual(browser.validateInput.inspect(command.commandId, { get title() { calls++; return "x"; } }),
    { valid: false, issues: [{ keyword: "json_value", instancePath: "" }] });
  assert.equal(calls, 0);
  assert.throws(() => browser.validateInput.inspect("unknown", {}), /Unknown command/);
  assert.doesNotMatch(code, /new Function|node:crypto/);
});
