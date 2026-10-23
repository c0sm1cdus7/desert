import type { AccessLockBarrier } from "../../web/client/access.ts";

export function browserAccessLock(): AccessLockBarrier {
  const key = "desert.session-lock/1";
  const sessionKey = "desert.session-generation/1";
  function storage() {
    const store = localStorage;
    store.setItem(`${key}.check`, "available");
    store.removeItem(`${key}.check`);
    return store;
  }
  return {
    isLocked: () => storage().getItem(key) !== null,
    lock() { const store = storage(); store.setItem(key, "locked"); if (store.getItem(key) !== "locked") throw new Error("LOCK_STORAGE_UNAVAILABLE"); },
    clear() { const store = storage(); store.removeItem(key); if (store.getItem(key) !== null) throw new Error("LOCK_STORAGE_UNAVAILABLE"); },
    generation: () => storage().getItem(sessionKey) ?? "initial",
    advance() {
      const store = storage(), next = crypto.randomUUID();
      store.setItem(sessionKey, next);
      if (store.getItem(sessionKey) !== next) throw new Error("LOCK_STORAGE_UNAVAILABLE");
    },
    subscribe(changed) {
      if (typeof window === "undefined") return () => {};
      const listener = (event: StorageEvent) => { if (event.key === key || event.key === sessionKey || event.key === null) changed(); };
      window.addEventListener("storage", listener);
      return () => window.removeEventListener("storage", listener);
    },
  };
}
