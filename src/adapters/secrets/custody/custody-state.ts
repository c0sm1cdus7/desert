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
  readonly ledger: CredentialLedger;
  readonly sessions = new Map<string, CredentialIngress>();
  readonly uses = new Map<SecretRef, number>();
  closed = false;
  constructor(file: string, _house: string, keys?: HouseKeyProvider, ledger?: CredentialLedger) {
    this.store = new CustodyDatabase(file);
    try {
      this.cipher = new CustodyCipher(this.store.identity(), keys);
      this.ledger = new AuthenticatedLedger(ledger ?? this.store, this.cipher);
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
    const check = this.store.keyCheck();
    if (check) {
      if (this.cipher.open("house-key-check", check) !== "custody-v1") throw new CustodyError("E-CUSTODY-INTEGRITY");
    } else {
      const create = !this.store.rows().some(row => row.payload !== null);
      this.store.saveKeyCheck(this.cipher.seal("house-key-check", "custody-v1", create));
    }
  }
  latest(scope: CredentialScope, slot: string): CredentialFact | undefined {
    return this.ledger
      .facts()
      .filter(
        fact =>
          sameScope(scope, fact) &&
          fact.slot === slot &&
          (fact.kind === "credential-bound" || fact.kind === "credential-released"),
      )
      .at(-1);
  }
  bindings(): CredentialFact[] {
    const latest = new Map<string, CredentialFact>();
    for (const fact of this.ledger.facts()) {
      if (fact.kind !== "credential-bound" && fact.kind !== "credential-released") continue;
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
    this.cipher.close();
    this.store.close();
  }
}
