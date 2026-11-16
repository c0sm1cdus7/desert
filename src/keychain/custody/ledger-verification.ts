import type { CredentialFact, CredentialLedger } from "./custody-contract.ts";
import type { CustodyCipher } from "./custody-cipher.ts";
import { CustodyError } from "./house-keys.ts";
export function factBody(fact: CredentialFact, position: number, previous: string): string {
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
/** The checkpoint contains only authenticated public facts. Never advance it inside an uncommitted transaction. */
export class VerifiedHistory {
  #facts: readonly CredentialFact[] = [];
  read(ledger: CredentialLedger, cipher: CustodyCipher): readonly CredentialFact[] {
    const prefix = ledger.factsAfter ? this.#facts : [];
    const tail = ledger.factsAfter ? ledger.factsAfter(prefix.length) : ledger.facts();
    let previous = prefix.at(-1)?.authentication ?? "",
      remaining = 0,
      size = 0;
    if (tail.length)
      cipher.verifying(verify => {
        for (const [index, fact] of tail.entries()) {
          if (!remaining) {
            size = fact.batchSize ?? 0;
            remaining = size;
          }
          if (
            !Number.isSafeInteger(size) ||
            size < 1 ||
            fact.batchSize !== size ||
            fact.batchIndex !== size - remaining
          )
            throw new CustodyError("E-CUSTODY-INTEGRITY");
          verify(factBody(fact, prefix.length + index, previous), fact.authentication);
          previous = fact.authentication ?? "";
          remaining--;
        }
        if (remaining) throw new CustodyError("E-CUSTODY-INTEGRITY");
      });
    const facts = [...prefix, ...tail];
    if (!ledger.pending?.()) this.#facts = facts;
    return facts;
  }
  snapshot(): readonly CredentialFact[] {
    return this.#facts;
  }
  committed(facts: readonly CredentialFact[]): void {
    this.#facts = facts;
  }
}
