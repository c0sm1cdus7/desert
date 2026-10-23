export const ActivityJournalVersion = "desert.activity-journal/1" as const;
export type PendingActivityAcceptance = { kind: "accept"; intentId: string };
export type ActivityJournalEntry = {
  version?: typeof ActivityJournalVersion; journey: string; occurrence: string; activity?: string;
  pending?: PendingActivityAcceptance;
};
export type ActivityHost = {
  load(): ActivityJournalEntry | null;
  save(entry: ActivityJournalEntry): void;
  clear(): void;
  createOccurrence(): string;
};

export function activityRecoveryRequired(entry: ActivityJournalEntry | null): boolean {
  return Boolean(entry?.pending || entry?.activity && entry.version !== ActivityJournalVersion);
}

export function requireActivityJournalEntry(value: unknown): ActivityJournalEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).some(key => !["version", "journey", "occurrence", "activity", "pending"].includes(key))
    || ("version" in value && value.version !== ActivityJournalVersion)
    || !("journey" in value) || typeof value.journey !== "string" || !value.journey
    || !("occurrence" in value) || typeof value.occurrence !== "string" || !value.occurrence
    || ("activity" in value && (typeof value.activity !== "string" || !value.activity))) {
    throw new Error("INVALID_ACTIVITY_JOURNAL");
  }
  const pending = "pending" in value ? value.pending : undefined;
  if (pending !== undefined && (!("activity" in value) || !pending || typeof pending !== "object" || Array.isArray(pending)
    || Object.keys(pending).some(key => !["kind", "intentId"].includes(key))
    || !("kind" in pending) || pending.kind !== "accept" || !("intentId" in pending)
    || typeof pending.intentId !== "string" || !pending.intentId)) throw new Error("INVALID_ACTIVITY_JOURNAL");
  return { ...("version" in value ? { version: ActivityJournalVersion } : {}), journey: value.journey, occurrence: value.occurrence,
    ...("activity" in value ? { activity: value.activity as string } : {}),
    ...(pending ? { pending: { kind: "accept", intentId: pending.intentId } as PendingActivityAcceptance } : {}) };
}

export function activityJournal(host?: ActivityHost) {
  return {
    read() { const entry = host?.load(); return entry ? requireActivityJournalEntry(entry) : null; },
    write(journey: string, occurrence: string, activity?: string, pending?: PendingActivityAcceptance) {
      if (!host) throw new Error("ACTIVITY_HOST_REQUIRED");
      host.save(requireActivityJournalEntry({ version: ActivityJournalVersion, journey, occurrence,
        ...(activity ? { activity } : {}), ...(pending ? { pending } : {}) }));
    },
    accepting(journey: string, activity: string, intentId: string) {
      const entry = this.read();
      if (!entry || entry.journey !== journey || entry.activity !== activity) throw new Error("INVALID_ACTIVITY_JOURNAL");
      this.write(journey, entry.occurrence, activity, { kind: "accept", intentId });
    },
    clear() { host?.clear(); },
    createOccurrence() { if (!host) throw new Error("ACTIVITY_HOST_REQUIRED"); return host.createOccurrence(); },
  };
}
