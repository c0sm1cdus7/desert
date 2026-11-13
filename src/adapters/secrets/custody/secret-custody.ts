import { randomUUID } from "node:crypto";
import { CustodyError, type HouseKeyProvider } from "./house-keys.ts";
import type {
  CredentialIngress,
  CredentialLedger,
  CredentialScope,
  SecretRef,
  SecretRefs,
} from "./custody-contract.ts";
import { CustodyState } from "./custody-state.ts";
import { collectCustody } from "./custody-cleanup.ts";
import { authorizeRefs, readMaterial, useMaterial } from "./custody-access.ts";
import { retainMaterial, adoptMaterial } from "./retained-material.ts";
import { migrateFieldVault } from "./custody-migration.ts";
export type CredentialSession = CredentialIngress &
  Readonly<{
    capture(value: string): SecretRef;
    current(slot: string): ReturnType<CustodyState["current"]>;
    revision(slot: string): number;
    replace(slot: string, refs: SecretRefs, expected: number): void;
    release(slot: string, expected: number): void;
    cancel(): void;
  }>;
/** Only the composition root holds this object. Actions will receive a restricted binding port in step two. */
export class SecretCustody {
  readonly #state: CustodyState;
  constructor(file: string, house: string, keys?: HouseKeyProvider, ledger?: CredentialLedger) {
    this.#state = new CustodyState(file, house, keys, ledger);
    try {
      migrateFieldVault(this.#state);
      if (this.#state.store.keyCheck()) this.#state.prepareKey();
      this.#state.store
        .rows()
        .filter(row => row.payload !== null)
        .forEach(row => readMaterial(this.#state, row.ref));
      collectCustody(this.#state);
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
      capture: (value: string) => this.capture(session, value),
      current: (slot: string) => {
        this.#state.check(session);
        return this.#state.current(session.scope, slot);
      },
      revision: (slot: string) => {
        this.#state.check(session);
        return this.#state.latest(session.scope, slot)?.revision ?? 0;
      },
      replace: (slot: string, refs: SecretRefs, expected: number) => this.replace(session, slot, refs, expected),
      release: (slot: string, expected: number) => this.release(session, slot, expected),
      cancel: () => {
        this.#state.sessions.delete(session.id);
        collectCustody(this.#state);
      },
    });
    this.#state.sessions.set(session.id, session);
    return session;
  }
  private capture(session: CredentialIngress, value: string): SecretRef {
    this.#state.check(session);
    const ref: SecretRef = `secret:${randomUUID()}`;
    this.#state.prepareKey();
    this.#state.store.intent(ref, session.id, false);
    this.#state.store.put(ref, this.#state.cipher.seal(ref, value, false));
    return ref;
  }
  private replace(session: CredentialIngress, slot: string, refs: SecretRefs, expected: number): void {
    this.#state.check(session);
    const revision = this.#state.revision(session.scope, slot, expected);
    authorizeRefs(this.#state, session, refs);
    Object.values(refs).forEach(ref => readMaterial(this.#state, ref));
    this.#state.fact("credential-bound", session.scope, slot, revision, refs, session.id);
    Object.values(refs).forEach(ref => this.#state.store.unretain(ref));
    collectCustody(this.#state);
  }
  private release(session: CredentialIngress, slot: string, expected: number): void {
    this.#state.check(session);
    const revision = this.#state.revision(session.scope, slot, expected);
    const refs = this.#state.current(session.scope, slot)?.refs ?? {};
    this.#state.fact("credential-released", session.scope, slot, revision, refs, session.id);
    collectCustody(this.#state);
  }
  adapter(session: CredentialSession, allowedSlots: readonly string[]) {
    this.#state.check(session);
    const slots = [...allowedSlots];
    return Object.freeze({
      capture: (value: string) => this.capture(session, value),
      use: <T>(refs: SecretRefs, body: (material: Readonly<Record<string, string>>) => T | Promise<T>) =>
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
  close(): void {
    this.#state.close();
  }
  /** Old redaction captures are held without authority until an explicit owner adopts their purpose. */
  keep(value: string): SecretRef {
    return retainMaterial(this.#state, value);
  }
  importLegacy(ref: SecretRef, value: string): void {
    retainMaterial(this.#state, value, ref);
  }
  verifyLegacy(ref: SecretRef): void {
    this.#state.check();
    readMaterial(this.#state, ref);
  }
  adopt(scope: CredentialScope, slot: string, refs: SecretRefs, expected = 0): void {
    adoptMaterial(this.#state, scope, slot, refs, expected);
  }
}
