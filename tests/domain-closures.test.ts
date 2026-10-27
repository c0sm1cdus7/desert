// Domain closures of slice 3 (design §3.0) at run time: field schemas stay in the closed subset and serialise exactly as
// before, diagnostics carry JSON parameters, and runtime identities are string tokens a contract can carry.
import assert from "node:assert/strict";
import test from "node:test";
import { Ajv } from "ajv";
import { file, labels } from "../src/contracts.ts";
import { inputPropertySchema } from "../src/input-schema.ts";
import { emitField } from "../src/schema.ts";
import { inspectValidation } from "../src/validation-result.ts";
import { viewEventOwnership } from "../src/web/client/view-events.ts";
import { runtimeToken } from "../src/web/client/runtime-token.ts";

const assetReference = '"additionalProperties":false,"type":"object","required":["kind","reference"],"properties":{"kind":{"const":"asset","type":"string"},'
  + '"reference":{"pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$","type":"string"}';

test("asset and label schemas are narrowed to the closed subset and serialise byte for byte as before", () => {
  assert.equal(JSON.stringify(emitField(file({ accept: ["image/jpeg", "image/png", "image/webp"], maxBytes: 20_971_520 }))), `{${assetReference},"media":{"type":"string","const":"image"}}}`);
  assert.equal(JSON.stringify(emitField(file({ accept: ["image/jpeg", "image/png", "image/webp", "video/mp4", "audio/mp4", "audio/mpeg", "audio/wav"], maxBytes: 20_971_520 }))), `{${assetReference},"media":{"type":"string","enum":["image","video","audio"]}}}`);
  assert.equal(JSON.stringify(emitField(file({ accept: ["application/zip", "image/png", "application/pdf"], maxBytes: 1024 }))),
    `{${assetReference},"media":{"type":"string","enum":["image","document","archive"]}}}`);
  assert.equal(JSON.stringify(emitField(labels())),
    '{"maxItems":12,"uniqueItems":true,"type":"array","items":{"minLength":1,"maxLength":64,"pattern":"^\\\\S(?:[\\\\s\\\\S]*\\\\S)?(?![\\\\s\\\\S])","type":"string"}}');
});

test("a field schema outside the emitted subset fails loudly", () => {
  for (const value of [{ type: "string", format: "email" }, { anyOf: [{ const: "image" }] }, { type: "number" }, null]) {
    assert.throws(() => inputPropertySchema(value), /^Error: INVALID_FIELD_SCHEMA: /, JSON.stringify(value));
  }
});

test("validation diagnostics carry frozen JSON parameters", () => {
  const validate = new Ajv({ allErrors: true }).compile({ type: "object", properties: { title: { type: "string", maxLength: 2 } },
    required: ["title", "body"], additionalProperties: false });
  const result = inspectValidation(validate, { title: "long" });
  assert.equal(result.valid, false);
  assert.deepEqual(result.issues.map(issue => [issue.keyword, issue.params]), [["required", { missingProperty: "body" }], ["maxLength", { limit: 2 }]]);
  assert.ok(Object.isFrozen(result.issues[0]?.params));
});

test("runtime tokens are distinct strings; an issued owner names itself with one and keeps it while its scope lasts", () => {
  assert.notEqual(runtimeToken("reading"), runtimeToken("reading"));
  assert.match(runtimeToken("reading"), /^reading-\d+$/);
  const scope = viewEventOwnership(), first = scope.sync(["notes", "detail"], true);
  assert.match(first.main.key, /^owner-\d+$/);
  assert.notEqual(first.main.key, first.panel?.key);
  assert.equal(scope.sync(["notes", "detail"], true).main.key, first.main.key);
  assert.notEqual(scope.sync(["notes", "list"], false).main.key, first.main.key);
});
