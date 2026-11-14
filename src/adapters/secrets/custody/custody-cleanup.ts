import { CustodyError } from "./house-keys.ts";
import type { CredentialFact, SecretRef } from "./custody-contract.ts";
import type { CustodyState } from "./custody-state.ts";
const maintenance = { actor: "custody", tool: "custody", target: "custody" };
function cleanupPlan(state: CustodyState) {
  const facts = state.ledger.facts(),
    rows = state.store.rows();
  const bound = new Set(state.bindings().flatMap(fact => Object.values(fact.refs)));
  const origins = new Map<SecretRef, CredentialFact>(),
    pending = new Map<SecretRef, CredentialFact>();
  const completed = new Set<SecretRef>();
  for (const fact of facts) {
    if (fact.kind === "credential-bound") for (const ref of Object.values(fact.refs)) origins.set(ref, fact);
    const ref = fact.refs.material;
    if (ref && fact.kind === "credential-cleanup-pending") pending.set(ref, fact);
    if (ref && fact.kind === "credential-purged") completed.add(ref);
  }
  const candidates = new Set<SecretRef>();
  for (const row of rows) {
    const provisional = row.owner !== null && state.sessions.has(row.owner) && !origins.has(row.ref);
    if (
      !bound.has(row.ref) &&
      !provisional &&
      !state.uses.has(row.ref) &&
      !state.store.held(row.ref) &&
      !(row.retained && !origins.has(row.ref))
    )
      candidates.add(row.ref);
  }
  const present = new Set(rows.map(row => row.ref));
  for (const ref of pending.keys()) if (!completed.has(ref) && !present.has(ref)) candidates.add(ref);
  return { candidates, origins, pending, completed };
}
/** Two durable additions regardless of candidate count: intents first, completed receipts after physical deletion. */
export function collectCustody(state: CustodyState): void {
  state.check();
  if (state.cleanupDepth) return;
  const { candidates, origins, pending, completed } = cleanupPlan(state);
  const record = (kind: CredentialFact["kind"], ref: SecretRef) => {
    const origin = origins.get(ref);
    state.fact(
      kind,
      origin ?? maintenance,
      origin?.slot ?? "",
      origin?.revision ?? 0,
      { material: ref },
      origin?.id ?? "unbound",
    );
  };
  const deleted: SecretRef[] = [];
  let failed = false;
  try {
    state.ledger.batch(() => {
      for (const ref of candidates) if (!pending.has(ref)) record("credential-cleanup-pending", ref);
    });
    for (const ref of candidates) {
      try {
        state.store.remove(ref);
        state.cipher.forget(ref);
        deleted.push(ref);
      } catch {
        failed = true;
      }
    }
    state.ledger.batch(() => {
      for (const ref of deleted) if (!completed.has(ref)) record("credential-purged", ref);
    });
    if (failed) throw new CustodyError("E-CUSTODY-CLEANUP");
    state.cleanupFailed = false;
  } catch {
    state.cleanupFailed = true;
    throw new CustodyError("E-CUSTODY-CLEANUP");
  }
}
/** Maintenance cannot replace the result of an already completed adapter, even when recording its failure fails. */
export function retryCleanup(state: CustodyState): void {
  try {
    collectCustody(state);
  } catch {
    state.cleanupFailed = true;
  }
}
