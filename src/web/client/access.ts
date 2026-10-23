import { Check } from "@sinclair/typebox/value";
import { AccessStateSchema, accessInput, type AccessState, type AccessInput } from "../../identity/contract.ts";
import { TransportError, type WebSessionBinding } from "./transport.ts";

export type BrowserAccessState = AccessState | { kind: "checking" | "unavailable" | "developer" };
export type AccessLockBarrier = Readonly<{
  isLocked(): boolean; lock(): void; clear(): void; generation(): string; advance(): void;
  subscribe(changed: () => void): () => void;
}>;
export function accessClient(digest: string, barrier: AccessLockBarrier, send: typeof fetch = fetch) {
  let state: BrowserAccessState = { kind: "checking" }, error: string | null = null;
  let forcedLock = false, revision = 0, refreshSequence = 0, busy = false;
  let generation: string | undefined, advancing = false;
  const listeners = new Set<() => void>();
  const notify = () => { for (const listener of listeners) listener(); };
  function hide() { ++revision; forcedLock = true; state = { kind: "locked" }; busy = false; notify(); }
  function storageFailure() {
    ++revision; state = { kind: "unavailable" }; busy = false;
    error = "Private workspace access needs available local browser storage. Restore it and try again."; notify();
  }
  const stopBarrier = barrier.subscribe(() => {
    try {
      const next = barrier.generation();
      const changed = generation !== undefined && generation !== next;
      generation = next;
      if (!advancing && (changed || barrier.isLocked())) hide();
    }
    catch { storageFailure(); }
  });
  function currentGeneration() {
    const next = barrier.generation();
    if (generation !== undefined && generation !== next) { generation = next; hide(); return false; }
    generation = next; return true;
  }
  async function request(path: string, body?: unknown, sessionBinding?: string) {
    const response = await send(`/api/${path}`, { method: body === undefined ? "GET" : "POST",
      credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/json", "X-Desert-Contract": digest,
        ...(sessionBinding ? { "X-Desert-Session": sessionBinding } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (sessionBinding && response.headers.get("X-Desert-Session") !== sessionBinding) {
      throw new TransportError(response.ok || response.status === 401 ? "BROWSER_SESSION_CHANGED" : "CONTROLLER_UNAVAILABLE");
    }
    const value: unknown = await response.json();
    if (!response.ok) throw new TransportError(value && typeof value === "object" && "error" in value
      && typeof value.error === "string" ? value.error : "INVALID_RESPONSE");
    return value;
  }
  function checked(value: unknown): AccessState | { kind: "developer" } {
    if (Check(AccessStateSchema, value)) return value;
    if (value && typeof value === "object" && Object.keys(value).join() === "kind" && "kind" in value && value.kind === "developer") return { kind: "developer" };
    throw new Error("INVALID_ACCESS_RESPONSE");
  }
  return {
    snapshot: () => ({ state, error, busy }),
    binding(): WebSessionBinding {
      if (state.kind === "developer") return { kind: "developer" };
      if (state.kind !== "ready") throw new TransportError("BROWSER_SESSION_REQUIRED");
      const sessionBinding = state.sessionBinding, instance = revision;
      return { kind: "identity", sessionBinding,
        isCurrent() {
          try {
            if (!currentGeneration() || barrier.isLocked()) { if (!forcedLock) hide(); return false; }
          } catch { storageFailure(); return false; }
          return instance === revision && state.kind === "ready" && state.sessionBinding === sessionBinding;
        },
        invalidate() { if (instance === revision) hide(); },
      };
    },
    subscribe(listener: () => void) { listeners.add(listener); listener(); return () => { listeners.delete(listener); }; },
    stop() { ++revision; stopBarrier(); listeners.clear(); state = { kind: "checking" }; error = null; busy = false; },
    async refresh() {
      if (busy || forcedLock) return;
      try { if (!currentGeneration()) return; if (barrier.isLocked()) { if (state.kind !== "locked") hide(); return; } }
      catch { storageFailure(); return; }
      const current = revision, sequence = ++refreshSequence;
      try {
        const next = checked(await request("accessState"));
        if (current !== revision || sequence !== refreshSequence || forcedLock) return;
        try { if (!currentGeneration()) return; if (barrier.isLocked()) { hide(); return; } }
        catch { storageFailure(); return; }
        if (next.kind === "locked" || (state.kind === "ready" &&
          (next.kind !== "ready" || state.sessionBinding !== next.sessionBinding))) { error = null; hide(); return; }
        state = next; error = null;
      } catch {
        if (current !== revision || sequence !== refreshSequence || forcedLock || state.kind === "ready") return;
        state = { kind: "unavailable" }; error = "Cannot reach the controller. Try again when it is available.";
      }
      notify();
    },
    async start(invitation?: string) {
      if (invitation) {
        try { await request("connect", { invitation }); }
        catch { state = { kind: "unavailable" }; error = "This launch invitation is unavailable. Open the host's current launch link."; notify(); return; }
      }
      await this.refresh();
    },
    async authenticate<K extends "initialize" | "signIn">(method: K, input: AccessInput<K>) {
      if (busy) return;
      busy = true; error = null; const current = ++revision; notify();
      try {
        barrier.isLocked(); generation = barrier.generation();
        const next = checked(await request(method, accessInput(method, input)));
        if (next.kind !== "ready") throw new Error("INVALID_ACCESS_RESPONSE");
        if (current !== revision || !currentGeneration()) return;
        advancing = true;
        try { barrier.advance(); generation = barrier.generation(); barrier.clear(); }
        finally { advancing = false; }
        forcedLock = false; state = next;
      } catch (cause) {
        if (current !== revision) return;
        error = cause instanceof TransportError && cause.code === "BOOTSTRAP_REQUIRED"
          ? "Open the host's private launch link to create the first administrator."
          : cause instanceof TransportError && cause.code === "INVALID_CREDENTIALS"
          ? "Check your identity name and password. After repeated attempts, wait five minutes before trying again."
          : "Could not sign in. Check the controller connection and try again.";
      } finally { if (current === revision) { busy = false; notify(); } }
    },
    async lock() {
      const sessionBinding = state.kind === "ready" ? state.sessionBinding : undefined;
      error = null; hide();
      let persisted = true;
      try { barrier.lock(); } catch { persisted = false; }
      const current = revision;
      try { await request("lock", {}, sessionBinding); }
      catch {
        if (current !== revision) return;
        error = persisted ? "Locked here. Could not confirm revocation with the controller; other sessions may remain active."
          : "Hidden here, but the browser could not save the lock and the controller did not confirm revocation. Reopening may resume this session; restore the connection and lock again.";
        notify();
      }
    },
  };
}
export type AccessClient = ReturnType<typeof accessClient>;
