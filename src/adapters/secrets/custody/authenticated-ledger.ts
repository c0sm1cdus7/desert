import { factBody, VerifiedHistory } from "./ledger-verification.ts";
import type { CredentialFact, CredentialLedger } from "./custody-contract.ts";
import type { CustodyCipher } from "./custody-cipher.ts";
import { type LedgerHead, CustodyError } from "./house-keys.ts";
/** The external head counts facts; batch size/index authenticate exactly one atomic addition after it. */
export class AuthenticatedLedger implements CredentialLedger {
  readonly #ledger: CredentialLedger;
  readonly #cipher: CustodyCipher;
  readonly #initialized: () => boolean;
  readonly #history = new VerifiedHistory();
  #reading = 0;
  #view: readonly CredentialFact[] | undefined;
  #anchorPending = false;
  #restoring = false;
  #staged: CredentialFact[] | undefined;
  constructor(ledger: CredentialLedger, cipher: CustodyCipher, initialized: () => boolean = () => true) {
    this.#ledger = ledger;
    this.#cipher = cipher;
    this.#initialized = initialized;
  }
  private verified(): readonly CredentialFact[] {
    return this.#history.read(this.#ledger, this.#cipher);
  }
  read<T>(work: () => T): T {
    this.#reading++;
    try {
      return work();
    } finally {
      if (!--this.#reading) this.#view = undefined;
    }
  }
  pending(): boolean {
    return this.#ledger.pending?.() ?? false;
  }
  snapshot(): readonly CredentialFact[] {
    return this.#history.snapshot();
  }
  anchorPending(): boolean {
    return this.#anchorPending;
  }
  private anchor(head: LedgerHead): void {
    try {
      this.#cipher.anchor(head);
      const saved = this.#cipher.head();
      if (saved?.count !== head.count || saved.authentication !== head.authentication)
        throw new CustodyError("E-CUSTODY-KEY");
      this.#anchorPending = false;
    } catch {
      this.#anchorPending = true;
    }
  }
  private checkHead(facts: readonly CredentialFact[], restore = false): void {
    const last = facts.at(-1)?.authentication ?? "";
    if (restore) {
      this.#cipher.anchor({ count: facts.length, authentication: last });
      return;
    }
    const head = this.#cipher.head();
    if (!head) throw new CustodyError("E-CUSTODY-KEY");
    const prefix = head.count === 0 ? "" : facts[head.count - 1]?.authentication;
    const extra = facts.length - head.count;
    if (
      extra < 0 ||
      prefix !== head.authentication ||
      (extra > 0 && (facts[head.count]?.batchIndex !== 0 || facts[head.count]?.batchSize !== extra))
    )
      throw new CustodyError("E-CUSTODY-ROLLBACK");
    if (extra) this.anchor({ count: facts.length, authentication: last });
    else this.#anchorPending = false;
  }
  facts(): readonly CredentialFact[] {
    const facts = this.#view ?? this.verified();
    if (this.#view) return [...facts, ...(this.#staged ?? [])];
    if (!facts.length && !this.#initialized()) return [...(this.#staged ?? [])];
    if (!this.#restoring && (!this.pending() || facts.length === this.#history.snapshot().length))
      this.checkHead(facts);
    if (this.#reading) this.#view = facts;
    return [...facts, ...(this.#staged ?? [])];
  }
  references(): string[] {
    return this.#ledger.facts().flatMap(fact => Object.values(fact.refs));
  }
  review(): readonly CredentialFact[] {
    return this.verified();
  }
  acceptRestored(
    check: (facts: readonly CredentialFact[]) => readonly CredentialFact[],
    expected: LedgerHead,
    complete: () => void,
  ): void {
    const facts = this.verified();
    if (expected.count !== facts.length || expected.authentication !== (facts.at(-1)?.authentication ?? ""))
      throw new CustodyError("E-CUSTODY-CONFLICT");
    const additions = check(facts);
    this.#restoring = true;
    try {
      if (additions.length) this.write(additions, facts);
      complete();
      this.checkHead(this.verified(), true);
    } finally {
      this.#restoring = false;
    }
  }
  append(fact: CredentialFact): void {
    if (this.#staged) {
      this.#staged.push(fact);
      return;
    }
    this.write([fact]);
  }
  private write(batch: readonly CredentialFact[], restored?: readonly CredentialFact[]): void {
    if (!batch.length) return;
    const facts = restored ?? this.facts();
    if (this.#anchorPending && !this.#restoring) throw new CustodyError("E-CUSTODY-KEY");
    let previous = facts.at(-1)?.authentication ?? "";
    const signed = this.#cipher.signing(sign =>
      batch.map((fact, index) => {
        const row = { ...fact, batchSize: batch.length, batchIndex: index };
        const authentication = sign(factBody(row, facts.length + index, previous));
        previous = authentication;
        return { ...row, authentication };
      }),
    );
    if (this.#ledger.appendBatch) this.#ledger.appendBatch(signed);
    else {
      if (signed.length !== 1) throw new CustodyError("E-CUSTODY-STORAGE");
      const row = signed[0];
      if (row) this.#ledger.append(row);
    }
    this.#view = undefined;
    const committed = [...facts, ...signed];
    const anchor = () => {
      this.#history.committed(committed);
      if (this.#reading) this.#view = committed;
      if (!this.#restoring) this.anchor({ count: committed.length, authentication: previous });
    };
    if (this.#ledger.afterCommit) this.#ledger.afterCommit(anchor);
    else anchor();
  }
  batch<T>(work: () => T): T {
    if (this.#staged) return work();
    this.#staged = [];
    try {
      const result = work(),
        staged = this.#staged;
      this.#staged = undefined;
      this.write(staged);
      return result;
    } finally {
      this.#staged = undefined;
    }
  }
}
