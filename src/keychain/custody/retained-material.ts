// Retains and adopts previous material with stable IDs and an explicit owner.
import { randomUUID, timingSafeEqual } from "node:crypto";
import type { CustodyState } from "./custody-state.ts";
import type { CredentialScope, SecretRef, SecretRefs } from "./custody-contract.ts";
import { CustodyError } from "./house-keys.ts";
import { readMaterial, checkMaterial } from "./custody-access.ts";
import { collectCustody } from "./custody-cleanup.ts";
import { secretRef } from "./custody-database.ts";
export function retainMaterial(
  state: CustodyState,
  value: Uint8Array,
  ref: SecretRef = `secret:${randomUUID()}`,
): SecretRef {
  let decoded: Uint8Array | undefined;
  try {
    state.check();
    if (!secretRef(ref)) throw new CustodyError("E-CUSTODY-LEGACY");
    if (
      state.ledger
        .facts()
        .some(
          fact =>
            (fact.kind === "credential-cleanup-pending" || fact.kind === "credential-purged") &&
            fact.refs.material === ref,
        )
    )
      throw new CustodyError("E-CUSTODY-DENIED");
    state.prepareKey();
    const existing = state.store.row(ref);
    if (!existing) state.store.intent(ref, null, true);
    if (!existing?.payload) state.store.put(ref, state.cipher.seal(ref, Uint8Array.from(value), true));
    decoded = readMaterial(state, ref);
    if (decoded.length !== value.length || !timingSafeEqual(decoded, value))
      throw new CustodyError("E-CUSTODY-INTEGRITY");
    return ref;
  } finally {
    decoded?.fill(0);
    value.fill(0);
  }
}
export function adoptMaterial(
  state: CustodyState,
  scope: CredentialScope,
  slot: string,
  refs: SecretRefs,
  expected: number,
): void {
  const revision = state.revision(scope, slot, expected);
  if (!Object.keys(refs).length || Object.values(refs).some(ref => !state.store.row(ref)?.retained))
    throw new CustodyError("E-CUSTODY-DENIED");
  Object.values(refs).forEach(ref => checkMaterial(state, ref));
  state.fact("credential-bound", scope, slot, revision, refs, "legacy-adoption");
  Object.values(refs).forEach(ref => state.store.unretain(ref));
  collectCustody(state);
}
