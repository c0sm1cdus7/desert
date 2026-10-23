import assert from "node:assert/strict";
import { test } from "node:test";
import { activityAnswerValidation } from "../src/activities/answer-validation.ts";

test("partial step validation ignores only missing later root inputs, never malformed present fields", () => {
  const required = (name: string) => ({ keyword: "required", instancePath: "", params: { missingProperty: name } });
  assert.deepEqual(activityAnswerValidation({ valid: false, issues: [required("body")] }, ["title"]), { valid: true, issues: [] });
  assert.equal(activityAnswerValidation({ valid: false, issues: [required("title")] }, ["title"]).valid, false);
  assert.equal(activityAnswerValidation({ valid: false, issues: [{ ...required("body"), instancePath: "/title" }] }, ["title"]).valid, false);
  assert.equal(activityAnswerValidation({ valid: false, issues: [{ keyword: "maxLength", instancePath: "/title" }, required("body")] }, ["title"]).valid, false);
  assert.equal(activityAnswerValidation({ valid: false, issues: [] }, ["title"]).valid, false, "unknown invalid diagnostics fail closed");
});
