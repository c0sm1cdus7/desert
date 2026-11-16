import { expect, it } from "vitest";
import { AuthenticatedLedger } from "./authenticated-ledger.ts";
import { CustodyCipher } from "./custody-cipher.ts";
import type { CredentialFact } from "./custody-contract.ts";
import { MemoryHouseKeys } from "./house-keys.ts";
function history(house: string, first: string) {
  const keys = new MemoryHouseKeys();
  keys.key = () => new Uint8Array(32).fill(17);
  const cipher = new CustodyCipher(house, keys);
  cipher.prepare(true);
  const rows: CredentialFact[] = [];
  const ledger = new AuthenticatedLedger(
    {
      facts: () => rows,
      append: fact => {
        rows.push(fact);
      },
    },
    cipher,
  );
  for (const id of [first, "last"])
    ledger.append({
      id,
      kind: "credential-bound",
      actor: "ana",
      tool: "t",
      target: "target",
      slot: id,
      revision: 1,
      refs: {},
      cause: "test",
    });
  return { rows, ledger, keys };
}
it("M6b: no se puede injertar el final firmado de otra rama con la misma posición", () => {
  const a = history("house", "one"),
    b = history("house", "other"),
    alternate = b.rows[0];
  if (!alternate) throw new Error("fixture");
  a.rows[0] = alternate;
  expect(() => a.ledger.facts()).toThrow("E-CUSTODY-INTEGRITY");
});
it("M6d: la misma llave y la misma cabeza no autorizan hechos de otra identidad", () => {
  const a = history("house-a", "same"),
    b = history("house-b", "same");
  b.rows.splice(0, b.rows.length, ...a.rows);
  b.keys.anchor("house-b", { count: 2, authentication: a.rows[1]?.authentication ?? "" });
  expect(() => b.ledger.facts()).toThrow("E-CUSTODY-INTEGRITY");
});

it("el primer renglón coincide con el vector HMAC v2 de posición, predecesor, lote y alcance", () => {
  expect(history("house", "one").rows[0]?.authentication).toBe(
    "0fcfcdab650d0a30dd4d1d6a1e33852db33a7c9e8283ecb7569268d8bf88fdd9",
  );
});
