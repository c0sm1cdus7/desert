export const journalTexts = {
  invalidEvent: "Invalid event envelope or unknown kind",
  unreadable: (seq: number, kind: string) =>
    `This house's journal holds a fact this program does not read: #${seq} ${kind}`,
  closedBus: "The event bus is closed",
  listenerFailed: "Someone who listens to the house failed on hearing a fact",
  locked: "This house is already open in a running process",
  kindTaken: (kinds: readonly string[]) => `The house already writes these kinds: ${kinds.join(", ")}`,
} as const;
