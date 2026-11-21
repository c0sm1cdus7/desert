// Autonomous owners explain each exception; business changes require registered actions.
export const autonomousFacts: Readonly<Record<string, string>> = {
  "house-created": "journal", // Bootstrap establishes the first administrator outside the catalog.
  boot: "journal", // Records that host startup completed.
  act: "journal", // Records an admitted action before execution.
  "act-started": "journal", // Retains an admitted asynchronous execution.
  "act-result": "journal", // Closes an admitted execution with its result.
  "act-done": "journal", // Keeps completion beside the action target.
  "tool-entry": "journal", // Publishes the result or infrastructure failure beside its target.
  attention: "journal", // Recalculates attention from current declarations.
  stimulus: "minds", // Records a wake caused by committed activity.
  "wake-at": "minds", // Schedules the continuation requested by a mind.
  woke: "minds", // Consumes the due continuation exactly once.
  "device-connected": "journal", // Records an authenticated connection and its current inventory.
  "device-disconnected": "journal", // Closes a disconnected, retired or stopped device session.
  "device-execution-started": "journal", // Records dispatch of a catalog action to its chosen device.
  "device-execution-unknown": "journal", // Preserves uncertainty after a remote execution is lost.
  "device-execution-result": "journal", // Records the authenticated result of the dispatched action.
  "device-execution-notice": "journal", // Records an authenticated device's word about its own announcing execution.
  "door-oauth-issued": "journal", // The OAuth door records a code digest after verified invitation redemption.
  "door-oauth-delivered": "journal", // The OAuth door records successful code exchange before returning the bearer.
  "mind-turn-opened": "minds", // Opens the turn caused by a recorded wake.
  "mind-answer-invalid": "minds", // Records failed validation without publishing proposed actions.
  "mind-consultation-requested": "minds", // Records a supervisor consultation within the current turn.
  "mind-consultation-answered": "minds", // Retains the answer to that consultation.
  "mind-review-recorded": "minds", // Records a verdict on a marked act, or a consultation and its answer.
  "mind-turn-closed": "minds", // Closes a completed, failed or interrupted turn.
  "mind-scene": "minds", // Publishes the mind's scene at the end of its turn.
  "mind-message": "minds", // Before 20/11 a mind's native message; old journals replay it, nothing writes it now.
  "mind-requested": "minds", // Before 20/11 a person's native request; old journals replay it, nothing writes it now.
  "journey-opened": "minds", // Records a journey its consciousness opened, with its goal and kit.
  "journey-plan-written": "minds", // Retains the plan of the mind's own journey.
  "journey-step-done": "minds", // Records progress on the mind's own journey.
  "journey-waiting": "minds", // Retains a requested continuation without executing it twice.
  "journey-resumed": "minds", // Wakes the mind's own open journey when its consciousness goes back to it.
  "journey-interrupted": "minds", // The house supervisor stops an open journey with its reason until it is resumed.
  "journey-closed": "minds", // Closes the mind's own journey with its outcome, summary and references.
  "model-account-opened": "bank", // Bootstrap records the host spending account opening once, outside any house.
  "model-account-cap-set": "bank", // Bootstrap records a signed new cap once, never below what was spent or reserved.
  "model-call-reserved": "bank", // Reserves the maximum cost before a provider call.
  "model-call-started": "bank", // Records the start of an already reserved call.
  "model-call-settled": "bank", // Reconciles observed consumption of the started call.
  "model-call-uncertain": "bank", // Retains the reservation when the result is unknown.
  "model-call-cancelled": "bank", // Releases an unused reservation.
  "mind-bank-tested": "bank", // Records role cases in three scenes with their fingerprints.
  "mind-cards-published": "bank", // Publishes every hand-assignable catalog card for selection when minds open.
  "rule-evaluated": "journal", // Records the mechanical guard before executing the admitted action.
};
