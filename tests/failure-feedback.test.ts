import assert from "node:assert/strict";
import test from "node:test";
import { failureFeedback } from "../src/web/client/failure-feedback.ts";

test("unknown outcomes never claim a known failure, including errors from retrying", () => {
  for (const code of ["CONNECTION_LOST", "COMMIT_UNCERTAIN", "INVALID_RESPONSE", "CONTROLLER_UNAVAILABLE",
    "PRECONDITION_FAILED", "VERSION_CONFLICT", "RUN_EXPIRED", "UNAUTHENTICATED", "UNRECOGNIZED_ERROR"]) {
    const feedback = failureFeedback(code, true);
    assert.equal(feedback.title, "The result isn’t confirmed", code);
    assert.match(feedback.description, /not known yet/i, code);
    assert.match(feedback.description, /check the result/i, code);
    assert.doesNotMatch(feedback.description, /no change was accepted|could not be completed|controller could not be reached/i, code);
  }
});

test("known precondition rejection retains specific advice outside recovery", () => {
  const feedback = failureFeedback("PRECONDITION_FAILED", false);
  assert.equal(feedback.title, "We couldn’t complete that action");
  assert.match(feedback.description, /No change was accepted/);
  assert.equal(failureFeedback(null).description, "");
});
