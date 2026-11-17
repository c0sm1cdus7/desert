// Mantenimiento cerrado: revisa, acepta una cabeza, informa pendientes, adopta, descarta y olvida por las dos fuentes.
import { secretTexts } from "../../texts/secrets.texts.ts";
import type { CredentialLedger, CredentialScope, SecretRef, SecretRefs } from "./custody-contract.ts";
import { CustodyError, type HouseKeyProvider, type LedgerHead } from "./house-keys.ts";
import { CustodyState } from "./custody-state.ts";
import { openCustody } from "./custody-opening.ts";
import { latestCredentials, reviewCustody } from "./custody-restoration.ts";
import { adoptMaterial } from "./retained-material.ts";
import { pendingCleanup, retryCleanup } from "./custody-cleanup.ts";
export type CustodyMaintenance =
  | Readonly<{ operation: "review" | "status" | "retry" }>
  | Readonly<{ operation: "accept"; head: LedgerHead }>
  | Readonly<{ operation: "adopt"; scope: CredentialScope; slot: string; refs: SecretRefs; expected: number }>
  | Readonly<{ operation: "discard"; ref: SecretRef }>
  | Readonly<{ operation: "forget"; acknowledgement: string }>;
/** Composition-only entry; both storage locks stay held until the synchronous operation finishes. */
export function maintainCustody(
  file: string,
  house: string,
  keys: HouseKeyProvider,
  ledger: CredentialLedger | undefined,
  request: CustodyMaintenance,
) {
  const state = new CustodyState(file, house, keys, ledger);
  try {
    if (request.operation === "forget") {
      if (request.acknowledgement !== secretTexts.forget) throw new CustodyError("E-CUSTODY-DENIED");
      forgetCustody(state);
      return { forgotten: true as const };
    }
    if (request.operation === "review") return status(state, true);
    openCustody(
      state,
      request.operation === "accept",
      request.operation === "accept" ? request.head : undefined,
      false,
    );
    if (request.operation === "adopt")
      adoptMaterial(state, request.scope, request.slot, request.refs, request.expected);
    if (request.operation === "discard") state.store.unretain(request.ref);
    if (request.operation !== "status") retryCleanup(state);
    return status(state);
  } finally {
    state.close();
  }
}
function status(state: CustodyState, reviewing = false) {
  const facts = reviewing ? state.ledger.review() : state.ledger.facts();
  const report = reviewCustody(state, facts);
  const purged = new Set(facts.filter(fact => fact.kind === "credential-purged").map(fact => fact.refs.material));
  const pending = facts.filter(fact => fact.kind === "credential-cleanup-pending" && !purged.has(fact.refs.material));
  const pendingRefs = reviewing ? pending.flatMap(fact => Object.values(fact.refs)) : pendingCleanup(state);
  return {
    ...report,
    forgotten: false as const,
    unusable: [...report.unusable, ...latestCredentials(facts).filter(fact => fact.kind === "credential-unusable")],
    pending,
    pendingRefs,
    anchorPending: state.ledger.anchorPending(),
    cleanupPending: state.cleanupFailed || pendingRefs.length > 0,
    forgetWarning: secretTexts.forget,
  };
}

export function forgetCustody(state: CustodyState): void {
  state.cipher.forgetHouse([...state.store.rows().map(row => row.ref), ...state.ledger.references()]);
}
