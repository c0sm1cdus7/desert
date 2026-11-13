import { CustodyError } from "./house-keys.ts";
import type { SecretRef } from "./custody-contract.ts";
import type { CustodyState } from "./custody-state.ts";
const maintenance = { actor: "custody", tool: "custody", target: "custody" };
function purge(state: CustodyState, ref: SecretRef): void {
  const facts = state.ledger.facts();
  const bound = facts.findLast(fact => fact.kind === "credential-bound" && Object.values(fact.refs).includes(ref));
  const origin = bound && state.latest(bound, bound.slot);
  if (!facts.some(fact => fact.kind === "credential-cleanup-pending" && fact.refs.material === ref))
    state.fact(
      "credential-cleanup-pending",
      origin ?? maintenance,
      origin?.slot ?? "",
      origin?.revision ?? 0,
      { material: ref },
      origin?.id ?? "unbound",
    );
  try {
    state.store.remove(ref);
  } catch {
    throw new CustodyError("E-CUSTODY-CLEANUP");
  }
  if (!facts.some(fact => fact.kind === "credential-purged" && fact.refs.material === ref))
    state.fact(
      "credential-purged",
      origin ?? maintenance,
      origin?.slot ?? "",
      origin?.revision ?? 0,
      { material: ref },
      origin?.id ?? "unbound",
    );
}
export function collectCustody(state: CustodyState): void {
  state.check();
  if (state.cleanupDepth) return;
  const facts = state.ledger.facts();
  const bound = new Set(state.bindings().flatMap(fact => Object.values(fact.refs)));
  const everBound = new Set(
    facts.filter(fact => fact.kind === "credential-bound").flatMap(fact => Object.values(fact.refs)),
  );
  for (const row of state.store.rows()) {
    const provisional = row.owner !== null && state.sessions.has(row.owner) && !everBound.has(row.ref);
    if (
      bound.has(row.ref) ||
      provisional ||
      state.uses.has(row.ref) ||
      state.store.held(row.ref) ||
      (row.retained && !everBound.has(row.ref))
    )
      continue;
    purge(state, row.ref);
  }
  // A cut after DELETE but before its receipt must still produce a completed receipt on recovery.
  const completed = new Set(facts.filter(fact => fact.kind === "credential-purged").map(f => f.refs.material));
  const present = new Set(state.store.rows().map(row => row.ref));
  for (const fact of facts) {
    const ref = fact.refs.material;
    if (fact.kind === "credential-cleanup-pending" && ref && !completed.has(ref) && !present.has(ref))
      purge(state, ref);
  }
}
