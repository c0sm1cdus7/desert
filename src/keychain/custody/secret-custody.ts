import { forgetCustody } from "./custody-maintenance.ts";
import { secretTexts } from "../../texts/secrets.texts.ts";
import { openCustody } from "./custody-opening.ts";
import { randomUUID } from "node:crypto";
import { CustodyError, type HouseKeyProvider, type LedgerHead } from "./house-keys.ts";
import type {
  CredentialIngress,
  CredentialLedger,
  CredentialScope,
  SecretRef,
  SecretRefs,
} from "./custody-contract.ts";
import { CustodyState } from "./custody-state.ts";
import { collectCustody, retryCleanup } from "./custody-cleanup.ts";
import { authorizeRefs, checkMaterial, useMaterial, captureMaterial } from "./custody-access.ts";
import { retainMaterial, adoptMaterial } from "./retained-material.ts";
export type CredentialSession = CredentialIngress &
  Readonly<{
    capture(value: Uint8Array): SecretRef;
    current(slot: string): ReturnType<CustodyState["current"]>;
    revision(slot: string): number;
    replace(slot: string, refs: SecretRefs, expected: number): void;
    release(slot: string, expected: number): void;
    cancel(): void;
  }>;
/** Only the composition root holds this object. Actions receive only a restricted binding port. */
export class SecretCustody {
  readonly #state: CustodyState;
  constructor(file: string, house: string, keys?: HouseKeyProvider, ledger?: CredentialLedger) {
    this.#state = new CustodyState(file, house, keys, ledger);
    try {
      this.#state.ledger.read(() => openCustody(this.#state));
    } catch (error) {
      this.#state.close();
      throw error instanceof CustodyError ? error : new CustodyError("E-CUSTODY-STORAGE");
    }
  }
  begin(scope: CredentialScope): CredentialSession {
    this.#state.check();
    const session: CredentialSession = Object.freeze({
      id: randomUUID(),
      scope: Object.freeze({ ...scope }),
      capture: (value: Uint8Array) => captureMaterial(this.#state, session, value),
      current: (slot: string) => {
        this.#state.check(session);
        return this.#state.current(session.scope, slot);
      },
      revision: (slot: string) => {
        this.#state.check(session);
        return this.#state.latest(session.scope, slot)?.revision ?? 0;
      },
      replace: (slot: string, refs: SecretRefs, expected: number) =>
        this.#state.ledger.read(() => this.replace(session, slot, refs, expected)),
      release: (slot: string, expected: number) => this.#state.ledger.read(() => this.release(session, slot, expected)),
      cancel: () => {
        if (this.#state.closed) return;
        this.#state.sessions.delete(session.id);
        this.#state.touched.delete(session.id);
        collectCustody(this.#state);
      },
    });
    this.#state.sessions.set(session.id, session);
    return session;
  }
  private replace(session: CredentialIngress, slot: string, refs: SecretRefs, expected: number): void {
    this.#state.check(session);
    const revision = this.#state.revision(session.scope, slot, expected);
    authorizeRefs(this.#state, session, refs);
    Object.values(refs).forEach(ref => checkMaterial(this.#state, ref));
    this.#state.fact("credential-bound", session.scope, slot, revision, refs, session.id);
    Object.values(refs).forEach(ref => this.#state.store.unretain(ref));
    if (!this.anchorPending()) collectCustody(this.#state);
  }
  private release(session: CredentialIngress, slot: string, expected: number): void {
    this.#state.check(session);
    const revision = this.#state.revision(session.scope, slot, expected);
    const refs = this.#state.current(session.scope, slot)?.refs ?? {};
    this.#state.fact("credential-released", session.scope, slot, revision, refs, session.id);
    if (!this.anchorPending()) collectCustody(this.#state);
  }
  /** Append inside the action's journal batch; cleanup waits until its lease closes after commit. */
  confirm(session: CredentialSession, slot: string, expected: number, refs?: SecretRefs): void {
    this.#state.check(session);
    const revision = this.#state.revision(session.scope, slot, expected);
    if (refs) {
      authorizeRefs(this.#state, session, refs);
      Object.values(refs).forEach(ref => checkMaterial(this.#state, ref));
    }
    this.#state.touched.add(session.id);
    this.#state.fact(
      refs ? "credential-bound" : "credential-released",
      session.scope,
      slot,
      revision,
      refs ?? this.#state.current(session.scope, slot)?.refs ?? {},
      session.id,
    );
  }
  adapter(session: CredentialSession, allowedSlots: readonly string[]) {
    this.#state.check(session);
    const slots = [...allowedSlots];
    return Object.freeze({
      capture: (value: Uint8Array) => captureMaterial(this.#state, session, value),
      use: <T>(refs: SecretRefs, body: (material: Readonly<Record<string, Uint8Array>>) => T | Promise<T>) =>
        useMaterial(this.#state, session, slots, refs, body),
    });
  }
  facts() {
    this.#state.check();
    return structuredClone(this.#state.ledger.facts());
  }
  ids() {
    this.#state.check();
    return this.#state.store.rows().map(row => row.ref);
  }
  deferCleanup<T>(work: () => T): T {
    this.#state.cleanupDepth++;
    try {
      return this.#state.ledger.read(() => this.#state.ledger.batch(work));
    } finally {
      this.#state.cleanupDepth--;
    }
  }
  finish(session: CredentialSession): void {
    if (this.#state.closed) return;
    this.#state.sessions.delete(session.id);
    if (this.#state.touched.delete(session.id)) retryCleanup(this.#state);
  }
  anchorPending(): boolean {
    return this.#state.ledger.anchorPending();
  }
  snapshot(session: CredentialSession, slots: readonly string[]) {
    return this.#state.snapshot(session, slots);
  }
  cleanupPending(): boolean {
    return this.#state.cleanupFailed;
  }
  collect(): void {
    collectCustody(this.#state);
  }
  retain(ref: SecretRef, purpose: string): void {
    this.#state.check();
    if (!this.#state.store.rows().some(row => row.ref === ref)) throw new CustodyError("E-CUSTODY-MISSING");
    this.#state.store.hold(ref, purpose);
  }
  releaseRetention(ref: SecretRef, purpose: string): void {
    this.#state.check();
    this.#state.store.unhold(ref, purpose);
    collectCustody(this.#state);
  }
  discardLegacy(ref: SecretRef): void {
    this.#state.check();
    this.#state.store.unretain(ref);
    collectCustody(this.#state);
  }
  static acceptRestoredCopy(
    file: string,
    house: string,
    keys: HouseKeyProvider,
    head: LedgerHead,
    ledger?: CredentialLedger,
  ): void {
    const state = new CustodyState(file, house, keys, ledger);
    try {
      state.ledger.read(() => openCustody(state, true, head));
    } finally {
      state.close();
    }
  }
  forgetWarning(): string {
    return secretTexts.forget;
  }
  forgetHouse(acknowledgement: string): void {
    if (acknowledgement !== this.forgetWarning()) throw new CustodyError("E-CUSTODY-DENIED");
    forgetCustody(this.#state);
    this.close();
  }
  close(): void {
    this.#state.close();
  }
  /** Old redaction captures are held without authority until an explicit owner adopts their purpose. */
  keep(value: Uint8Array): SecretRef {
    return retainMaterial(this.#state, value);
  }
  importLegacy(ref: SecretRef, value: Uint8Array): void {
    retainMaterial(this.#state, value, ref);
  }
  verifyLegacy(ref: SecretRef): void {
    this.#state.check();
    checkMaterial(this.#state, ref);
  }
  adopt(scope: CredentialScope, slot: string, refs: SecretRefs, expected = 0): void {
    this.#state.ledger.read(() => adoptMaterial(this.#state, scope, slot, refs, expected));
  }
}
