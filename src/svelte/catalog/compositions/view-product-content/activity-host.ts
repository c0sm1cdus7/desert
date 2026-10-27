import { requireActivityJournalEntry, type ActivityHost } from "../../../../web/client/activity-host.ts";
import type { BrowserAccessState } from "../../../../web/client/access.ts";

export function browserActivityHost(contract: string, surface: string, access: BrowserAccessState): ActivityHost {
  if (access.kind !== "ready" && access.kind !== "developer") throw new Error("ACTIVITY_IDENTITY_REQUIRED");
  const principal = access.kind === "ready" ? `identity/${access.identity.id}` : "developer";
  const key = `desert.activity/${contract}/${surface}/${principal}`;
  return {
    load() {
      const encoded = sessionStorage.getItem(key);
      return encoded === null ? null : requireActivityJournalEntry(JSON.parse(encoded));
    },
    save(entry) {
      const encoded = JSON.stringify(requireActivityJournalEntry(entry));
      sessionStorage.setItem(key, encoded);
      if (sessionStorage.getItem(key) !== encoded) throw new Error("ACTIVITY_STORAGE_UNAVAILABLE");
    },
    clear() {
      sessionStorage.removeItem(key);
      if (sessionStorage.getItem(key) !== null) throw new Error("ACTIVITY_STORAGE_UNAVAILABLE");
    },
    createOccurrence: () => crypto.randomUUID(),
  };
}
