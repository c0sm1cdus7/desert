// Names every reason a mind's turn can stop for, shared by the closing fact and the words that explain it.
export const turnStops = [
  "call-limit",
  "frame-too-large",
  "conversation-too-large",
  "no-key",
  "no-card",
  "cap",
  "http",
  "transport",
  "uncertain",
  "invalid",
  "rejected",
  "review-failed",
  "review-stale",
  "act-uncertain",
  "act-failed",
  "inactive",
  "permission",
  "interrupted",
  "internal",
] as const;
export type TurnStop = (typeof turnStops)[number];
