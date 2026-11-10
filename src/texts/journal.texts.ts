export const journalTexts = {
  invalidEvent: "Invalid event envelope or unknown kind",
  closedBus: "The event bus is closed",
  listenerFailed: "Event listeners failed after persistence",
  locked: "This house is already open in a running process",
  kindTaken: (kinds: readonly string[]) => `The house already writes these kinds: ${kinds.join(", ")}`,
} as const;
