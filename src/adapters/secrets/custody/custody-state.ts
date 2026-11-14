import { custodyPreflight } from "./custody-database.ts";
import { randomUUID } from "node:crypto";
import { CustodyDatabase } from "./custody-database.ts";
import { AuthenticatedLedger } from "./authenticated-ledger.ts";
import { CustodyCipher } from "./custody-cipher.ts";
import { CustodyError, type HouseKeyProvider } from "./house-keys.ts";
import {
  sameScope,
  type Credential,
  type CredentialFact,
  type CredentialIngress,
  type CredentialLedger,
  type CredentialScope,
  type SecretRef,
  type SecretRefs,
} from "./custody-contract.ts";
export class CustodyState {
  readonly store: CustodyDatabase;
  readonly cipher: CustodyCipher;
  readonly ledger: AuthenticatedLedger;
  readonly buffers = new Set<Uint8Array>();
  readonly sessions = new Map<string, CredentialIngress>();
  readonly touched = new Set<string>();
  readonly uses = new Map<SecretRef, number>();
  closed = false;
  cleanupDepth = 0;
  cleanupFailed = false;
  cleanupNeeded = false;
  constructor(file: string, _house: string, keys?: HouseKeyProvider, ledger?: CredentialLedger) {
    custodyPreflight(file, !!keys);
    this.store = new CustodyDatabase(file);
    try {
      const house = this.store.identity();
      this.cipher = new CustodyCipher(house, keys);
      this.ledger = new AuthenticatedLedger(
        ledger ?? this.store,
        this.cipher,
        () => !!this.store.keyCheck() || !!keys?.head(house),
      );
    } catch (error) {
      this.store.close();
      throw error;
    }
  }
  check(session?: CredentialIngress): void {
    if (this.closed || (session && this.sessions.get(session.id) !== session))
      throw new CustodyError("E-CUSTODY-DENIED");
  }
  prepareKey(): void {
    if (this.store.keyCheck()) return;
    const create = !this.store.rows().some(row => row.payload !== null) && !this.store.facts().length;
    this.cipher.prepare(create);
    this.store.saveKeyCheck("custody-v2");
  }

  latest(scope: CredentialScope, slot: string, facts = this.ledger.facts()): CredentialFact | undefined {
    return facts
      .filter(
        fact =>
          sameScope(scope, fact) &&
          fact.slot === slot &&
          (fact.kind === "credential-bound" ||
            fact.kind === "credential-released" ||
            fact.kind === "credential-unusable"),
      )
      .at(-1);
  }
  snapshot(session: CredentialIngress, slots: readonly string[]) {
    const initial = this.ledger.snapshot();
    return () => {
      this.check(session);
      this.ledger.facts();
      return new Map(
        slots.map(slot => {
          const fact = this.latest(session.scope, slot, initial);
          const current =
            fact?.kind === "credential-bound" ? { revision: fact.revision, refs: { ...fact.refs } } : undefined;
          return [slot, { current, revision: fact?.revision ?? 0 }] as const;
        }),
      );
    };
  }
  bindings(): CredentialFact[] {
    const latest = new Map<string, CredentialFact>();
    for (const fact of this.ledger.facts()) {
      if (
        fact.kind !== "credential-bound" &&
        fact.kind !== "credential-released" &&
        fact.kind !== "credential-unusable"
      )
        continue;
      latest.set(JSON.stringify([fact.actor, fact.tool, fact.target, fact.slot]), fact);
    }
    return [...latest.values()].filter(fact => fact.kind === "credential-bound");
  }
  current(scope: CredentialScope, slot: string): Credential | undefined {
    const fact = this.latest(scope, slot);
    return fact?.kind === "credential-bound" ? { revision: fact.revision, refs: { ...fact.refs } } : undefined;
  }
  revision(scope: CredentialScope, slot: string, expected: number): number {
    this.check();
    const revision = this.latest(scope, slot)?.revision ?? 0;
    if (revision !== expected) throw new CustodyError("E-CUSTODY-CONFLICT");
    return revision + 1;
  }
  fact(
    kind: CredentialFact["kind"],
    scope: CredentialScope,
    slot: string,
    revision: number,
    refs: SecretRefs,
    cause = "",
  ): void {
    this.prepareKey();
    this.cleanupNeeded = true;
    this.ledger.append({
      id: randomUUID(),
      kind,
      actor: scope.actor,
      tool: scope.tool,
      target: scope.target,
      slot,
      revision,
      refs: { ...refs },
      cause,
    });
  }
  authorized(session: CredentialIngress, ref: SecretRef, slots?: readonly string[]): boolean {
    const bound = this.bindings();
    const wasBound = this.ledger
      .facts()
      .some(fact => fact.kind === "credential-bound" && Object.values(fact.refs).includes(ref));
    if (!wasBound && this.store.rows().some(row => row.ref === ref && row.owner === session.id)) return true;
    return bound.some(
      fact =>
        sameScope(fact, session.scope) &&
        (!slots || slots.includes(fact.slot)) &&
        Object.values(fact.refs).includes(ref),
    );
  }
  close(): void {
    this.closed = true;
    this.sessions.clear();
    this.touched.clear();
    for (const buffer of this.buffers) buffer.fill(0);
    this.buffers.clear();
    this.cipher.close();
    this.store.close();
  }
}
