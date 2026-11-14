import { randomUUID } from "node:crypto";
import type { CredentialFact } from "./custody-contract.ts";
import type { CustodyState } from "./custody-state.ts";
import { CustodyError } from "./house-keys.ts";
export function latestCredentials(facts: readonly CredentialFact[]): CredentialFact[] {
  const latest = new Map<string, CredentialFact>();
  for (const fact of facts)
    if (["credential-bound", "credential-released", "credential-unusable"].includes(fact.kind))
      latest.set(JSON.stringify([fact.actor, fact.tool, fact.target, fact.slot]), fact);
  return [...latest.values()];
}
export const latestBindings = (facts: readonly CredentialFact[]): CredentialFact[] =>
  latestCredentials(facts).filter(fact => fact.kind === "credential-bound");
/** Review authenticates every envelope but never decrypts or changes the external anchor. */
export function reviewCustody(state: CustodyState, facts = state.ledger.review()) {
  const rows = state.store.rows();
  for (const row of rows) if (row.payload !== null) state.cipher.check(row.ref, row.payload);
  const present = new Set(rows.filter(row => row.payload !== null).map(row => row.ref));
  const bindings = latestBindings(facts);
  for (const fact of bindings)
    if (Object.values(fact.refs).some(ref => !present.has(ref))) throw new CustodyError("E-CUSTODY-MISSING");
  const missing = rows.filter(row => row.payload !== null && !state.cipher.present(row.ref)).map(row => row.ref);
  const absent = new Set(missing);
  const unusable = bindings.filter(fact => Object.values(fact.refs).some(ref => absent.has(ref)));
  return {
    head: { count: facts.length, authentication: facts.at(-1)?.authentication ?? "" },
    bindings,
    missing,
    unusable,
    retained: rows.filter(row => row.retained).map(row => row.ref),
  };
}
export function restoredFacts(state: CustodyState, facts: readonly CredentialFact[]): CredentialFact[] {
  const review = reviewCustody(state, facts);
  const retired = new Set(
    facts
      .filter(fact => fact.kind === "credential-cleanup-pending" && fact.cause === "restored-without-key")
      .map(fact => fact.refs.material),
  );
  return [
    ...review.unusable.map(fact => ({
      ...fact,
      id: randomUUID(),
      kind: "credential-unusable" as const,
      revision: fact.revision + 1,
      cause: "restored-without-key",
    })),
    ...review.missing
      .filter(ref => !retired.has(ref))
      .map(ref => ({
        id: randomUUID(),
        kind: "credential-cleanup-pending" as const,
        actor: "custody",
        tool: "custody",
        target: "custody",
        slot: "",
        revision: 0,
        refs: { material: ref },
        cause: "restored-without-key",
      })),
  ];
}
