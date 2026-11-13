import type { CredentialFact, CredentialLedger } from "./custody-contract.ts";
import type { CustodyCipher } from "./custody-cipher.ts";
/** Bind every row to its house, position and predecessor. A complete old backup remains a valid old history. */
export class AuthenticatedLedger implements CredentialLedger {
  readonly #ledger: CredentialLedger;
  readonly #cipher: CustodyCipher;
  constructor(ledger: CredentialLedger, cipher: CustodyCipher) {
    this.#ledger = ledger;
    this.#cipher = cipher;
  }
  private body(fact: CredentialFact, position: number, previous: string): string {
    return JSON.stringify([
      position,
      previous,
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
  facts(): readonly CredentialFact[] {
    const facts = this.#ledger.facts();
    let previous = "";
    for (const [index, fact] of facts.entries()) {
      this.#cipher.verify(this.body(fact, index, previous), fact.authentication);
      previous = fact.authentication ?? "";
    }
    return facts;
  }
  append(fact: CredentialFact): void {
    const facts = this.facts();
    const authentication = this.#cipher.sign(this.body(fact, facts.length, facts.at(-1)?.authentication ?? ""));
    this.#ledger.append({ ...fact, authentication });
  }
}
