import type { CredentialFact, CredentialLedger } from "./custody-contract.ts";
import type { CustodyCipher } from "./custody-cipher.ts";
import { CustodyError } from "./house-keys.ts";
/** The external head counts facts; batch size/index authenticate exactly one atomic addition after it. */
export class AuthenticatedLedger implements CredentialLedger {
  readonly #ledger: CredentialLedger;
  readonly #cipher: CustodyCipher;
  readonly #initialized: () => boolean;
  #staged: CredentialFact[] | undefined;
  constructor(ledger: CredentialLedger, cipher: CustodyCipher, initialized: () => boolean = () => true) {
    this.#ledger = ledger;
    this.#cipher = cipher;
    this.#initialized = initialized;
  }
  private body(fact: CredentialFact, position: number, previous: string): string {
    return JSON.stringify([
      position,
      previous,
      fact.batchSize,
      fact.batchIndex,
      fact.id,
      fact.kind,
      fact.actor,
      fact.tool,
      fact.target,
      fact.slot,
      fact.revision,
      Object.entries(fact.refs).sort(([a], [b]) => (a < b ? -1 : Number(a > b))),
      fact.cause,
    ]);
  }
  private verified(): readonly CredentialFact[] {
    const facts = this.#ledger.facts();
    let previous = "",
      remaining = 0,
      size = 0;
    for (const [index, fact] of facts.entries()) {
      if (!remaining) {
        size = fact.batchSize ?? 0;
        remaining = size;
      }
      if (!Number.isSafeInteger(size) || size < 1 || fact.batchSize !== size || fact.batchIndex !== size - remaining)
        throw new CustodyError("E-CUSTODY-INTEGRITY");
      this.#cipher.verify(this.body(fact, index, previous), fact.authentication);
      previous = fact.authentication ?? "";
      remaining--;
    }
    if (remaining) throw new CustodyError("E-CUSTODY-INTEGRITY");
    return facts;
  }
  private checkHead(facts: readonly CredentialFact[], restore = false): void {
    const head = this.#cipher.head();
    if (!head) throw new CustodyError("E-CUSTODY-KEY");
    const last = facts.at(-1)?.authentication ?? "";
    if (restore) {
      this.#cipher.anchor({ count: facts.length, authentication: last });
      return;
    }
    const prefix = head.count === 0 ? "" : facts[head.count - 1]?.authentication;
    const extra = facts.length - head.count;
    if (
      extra < 0 ||
      prefix !== head.authentication ||
      (extra > 0 && (facts[head.count]?.batchIndex !== 0 || facts[head.count]?.batchSize !== extra))
    )
      throw new CustodyError("E-CUSTODY-ROLLBACK");
    if (extra) this.#cipher.anchor({ count: facts.length, authentication: last });
  }
  facts(): readonly CredentialFact[] {
    const facts = this.verified();
    if (!facts.length && !this.#initialized()) return [...(this.#staged ?? [])];
    if (!this.#ledger.pending?.()) this.checkHead(facts);
    return [...facts, ...(this.#staged ?? [])];
  }
  acceptRestored(check: (facts: readonly CredentialFact[]) => void): void {
    const facts = this.verified();
    check(facts);
    this.checkHead(facts, true);
  }
  append(fact: CredentialFact): void {
    if (this.#staged) {
      this.#staged.push(fact);
      return;
    }
    this.write([fact]);
  }
  private write(batch: readonly CredentialFact[]): void {
    if (!batch.length) return;
    const facts = this.facts();
    let previous = facts.at(-1)?.authentication ?? "";
    const signed = batch.map((fact, index) => {
      const row = { ...fact, batchSize: batch.length, batchIndex: index };
      const authentication = this.#cipher.sign(this.body(row, facts.length + index, previous));
      previous = authentication;
      return { ...row, authentication };
    });
    if (this.#ledger.appendBatch) this.#ledger.appendBatch(signed);
    else {
      if (signed.length !== 1) throw new CustodyError("E-CUSTODY-STORAGE");
      const row = signed[0];
      if (row) this.#ledger.append(row);
    }
    const anchor = () => this.checkHead(this.verified());
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
