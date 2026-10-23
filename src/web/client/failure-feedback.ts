const messages: Record<string, string> = {
  BROWSER_SESSION_REQUIRED: "Open the private launch link from the local host to connect this browser.",
  UNAUTHENTICATED: "The local credential has expired or was revoked. Your draft stays here while you restore access.",
  CONNECTION_LOST: "The controller could not be reached. Your draft is still here. If you confirmed a change, check its result when the connection returns.",
  COMMIT_UNCERTAIN: "The response was lost. Check the result of this confirmation before trying anything else.",
  PRECONDITION_FAILED: "This action is no longer available for the current record. No change was accepted.",
  VERSION_CONFLICT: "The record changed after your review. Go back and review its current version.",
  RUN_EXPIRED: "This review has expired. Go back to prepare a fresh review. Your draft is still here.",
  CONTRACT_MISMATCH: "The surface and controller use different contracts. This session cannot continue safely.",
};

export function failureFeedback(code: string | null, uncertain = false) {
  if (uncertain) return { title: "The result isn’t confirmed", description:
    "The result of this confirmation is not known yet. Close this message, then check the result when the connection is available. Checking does not create another operation." };
  if (code === "READ_REFRESH_FAILED") return { title: "We couldn’t refresh the data", description:
    "The latest data could not be loaded. Your unsent changes are preserved." };
  return { title: "We couldn’t complete that action", description: code
    ? messages[code] ?? "The operation could not be completed. Your draft has been kept. Restore the connection and try again."
    : "" };
}
