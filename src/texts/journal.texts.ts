export const journalTexts = {
  leaseLost: "The writer sidecar was removed or replaced; close and reopen this house",
  rebuildCode: "SAVED_FOLD_REBUILT",

  copyJournal: "vacuum into ?",
  identityTable:
    "create table if not exists journal_identity (singleton integer primary key check(singleton = 1), id text)",
  identityInsert: "insert or ignore into journal_identity values (1, ?)",
  identityRead: "select id from journal_identity where singleton = 1",
  rebuilt: "Saved state is being rebuilt from the journal",
  rebuildNotice: (name: string, reason: string) =>
    `Saved fold ${name} discarded: ${reason}; rebuilding from the journal`,
  unreadableFold: "truncated or unreadable format",
  oldFold: "old or unsupported format version",
  aheadFold: "invalid or ahead sequence",
  foreignFold: "different journal identity",
  changedFold: "different calculation version",
  unwatchedFold: "projection name or calculation version changed",
  dependentFold: "dependent group is incomplete, incompatible or at different sequences",

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
