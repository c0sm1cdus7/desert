export const journalTexts = {
  keptBootSql: "select by from events where kind = 'boot' order by seq limit 1",
  lastInstantSql: "select max(at) as at from events",
  lastSequenceSql: "select coalesce(max(seq), 0) as seq from events",
  previousFoldsSql: "select name, state from snapshots",
  discardFoldsSql: "delete from snapshots",
  previousRequired: (name: string) => `${name}: readable previous folds are required`,
  upgradeMismatch: (name: string) => `${name}: projectionVersion differs from the calculations`,
  invalidEvent: "Invalid event envelope or unknown kind",
  unreadable: (seq: number, kind: string) =>
    `This house's journal holds a fact this program does not read: #${seq} ${kind}`,
  closedBus: "The event bus is closed",
  listenerFailed: "Someone who listens to the house failed on hearing a fact",
  writerLeaseSql: "pragma busy_timeout = 0; begin immediate",
  reopenedMismatch: "Reopened state differs from the complete journal fold",
  locked: "This house is already open in a running process",
  kindTaken: (kinds: readonly string[]) => `The house already writes these kinds: ${kinds.join(", ")}`,
} as const;
