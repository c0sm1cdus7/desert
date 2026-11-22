import { expect, it, vi } from "vitest";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { AuthenticatedLedger } from "./authenticated-ledger.ts";
import { CustodyCipher } from "./custody-cipher.ts";
import { CustodyDatabase } from "./custody-database.ts";
import type { CredentialFact } from "./custody-contract.ts";
const fact = (id: string): CredentialFact => ({
  id,
  kind: "credential-bound",
  ...custodyScope,
  slot: id,
  revision: 1,
  refs: {},
  cause: "fixture",
});
it("one pass asks for a single key, erases it even with a forged row and keeps no keys between reads", () => {
  const rig = custodyRig(),
    cipher = new CustodyCipher("house", rig.keys),
    rows: CredentialFact[] = [];
  cipher.prepare(true);
  const raw = {
    facts: () => rows,
    append: (row: CredentialFact) => {
      rows.push(row);
    },
  };
  const ledger = new AuthenticatedLedger(raw, cipher);
  for (let i = 0; i < 60; i++) ledger.append(fact(String(i)));
  const key = vi.spyOn(rig.keys, "key");
  for (const corrupt of [false, true]) {
    key.mockClear();
    if (corrupt) rows.push({ ...fact("forged"), authentication: "a".repeat(64), batchSize: 1, batchIndex: 0 });
    if (corrupt) expect(() => ledger.facts()).toThrow("E-CUSTODY-INTEGRITY");
    else expect(ledger.facts()).toHaveLength(60);
    expect(key).toHaveBeenCalledTimes(1);
    const buffers = key.mock.results.flatMap(result => (result.type === "return" ? [result.value] : []));
    expect(buffers.every(buffer => buffer.every(byte => byte === 0))).toBe(true);
  }
});
it("the tail is verified from the confirmed point; a broken tail does not advance that point", () => {
  const rig = custodyRig(),
    cipher = new CustodyCipher("house", rig.keys),
    rows: CredentialFact[] = [];
  cipher.prepare(true);
  const tail = vi.fn((count: number) => rows.slice(count));
  const ledger = new AuthenticatedLedger(
    {
      facts: () => rows,
      factsAfter: tail,
      append: row => {
        rows.push(row);
      },
    },
    cipher,
  );
  ledger.append(fact("one"));
  const key = vi.spyOn(rig.keys, "key");
  ledger.facts();
  expect(tail).toHaveBeenLastCalledWith(1);
  expect(key).not.toHaveBeenCalled();
  rows.push({ ...fact("forged"), authentication: "a".repeat(64), batchSize: 1, batchIndex: 0 });
  expect(() => ledger.facts()).toThrow("E-CUSTODY-INTEGRITY");
  rows.pop();
  expect(ledger.facts()).toHaveLength(1);
  expect(tail).toHaveBeenLastCalledWith(1);
  ledger.append(fact("two"));
  expect(ledger.facts()).toHaveLength(2);
});
it("every opening verifies the whole history again and the open read keeps comparing the anchor", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  session.replace("signing", { key: session.capture(Buffer.from("invented")) }, 0);
  store.close();
  const tails = vi.spyOn(CustodyDatabase.prototype, "factsAfter");
  const opened = rig.open();
  expect(tails.mock.calls.some(([count]) => count === 0)).toBe(true);
  const head = vi.spyOn(rig.keys, "head");
  opened.facts();
  expect(head).toHaveBeenCalledTimes(1);
  const house = head.mock.calls[0]?.[0];
  if (!house) throw new Error("fixture");
  rig.keys.anchor(house, { count: 1, authentication: "a".repeat(64) });
  expect(() => opened.facts()).toThrow("E-CUSTODY-ROLLBACK");
});
