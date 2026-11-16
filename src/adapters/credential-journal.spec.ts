import { expect, it } from "vitest";
import { join } from "node:path";
import { custodyRig } from "../../tests/support/custody-rig.ts";
import { credentialJournal } from "./credential-journal.ts";
import { SqliteJournal } from "../storage/journal-store.ts";
import { effect } from "../house/facts.ts";
import { vocabulary } from "../journal/facts.ts";
import { CustodyCipher } from "../keychain/custody/custody-cipher.ts";
import { AuthenticatedLedger } from "../keychain/custody/authenticated-ledger.ts";
import type { CredentialFact } from "../keychain/custody/custody-contract.ts";
const fact = (id: string): CredentialFact => ({
  id,
  kind: "credential-bound",
  actor: "ana",
  tool: "vault",
  target: "vault",
  slot: id,
  revision: 1,
  refs: {},
  cause: "test",
});
it("ancla al salir del commit sin esperar otra lectura y descarta callbacks de rollback", () => {
  const rig = custodyRig(),
    journal = new SqliteJournal(join(rig.home, "events.sqlite"), vocabulary({}));
  try {
    const bridge = credentialJournal(
      () =>
        journal.replay<ReturnType<typeof journal.append>[]>([], (all, event) => {
          all.push(event);
          return all;
        }),
      entry => journal.append(entry, 1000),
    );
    const cipher = new CustodyCipher("fixture", rig.keys);
    cipher.prepare(true);
    const ledger = new AuthenticatedLedger(bridge.ledger, cipher);
    bridge.publish(entry => {
      journal.append(entry, 1000);
      ledger.facts();
    });
    let rollbacks = 0,
      commits = 0,
      direct = 0;
    bridge.ledger.afterCommit?.(() => {
      direct++;
    });
    expect(direct).toBe(1);
    expect(() =>
      bridge.transaction(() =>
        journal.batch(() => {
          bridge.ledger.afterCommit?.(() => {
            rollbacks++;
          });
          ledger.batch(() => ledger.append(fact("rollback")));
          throw new Error("rollback");
        }),
      ),
    ).toThrow("rollback");
    expect(rig.keys.head("fixture")).toEqual({ count: 0, authentication: "" });
    expect(bridge.ledger.facts()).toEqual([]);
    bridge.transaction(() =>
      journal.batch(() => {
        bridge.ledger.afterCommit?.(() => {
          expect(bridge.ledger.pending?.()).toBe(false);
          commits++;
        });
        ledger.batch(() => {
          ledger.append(fact("one"));
          ledger.append(fact("two"));
        });
      }),
    );
    expect(rig.keys.head("fixture")).toEqual({
      count: 2,
      authentication: bridge.ledger.facts().at(-1)?.authentication,
    });
    expect(rollbacks).toBe(0);
    expect(commits).toBe(1);
    bridge.transaction(() => undefined);
    expect(commits).toBe(1);
  } finally {
    journal.close();
  }
});
for (const detail of [{ custodyFact: {} }, { custodyBatch: "invalid" }, { custodyBatch: [{}] }])
  it("no ignora una entrada reservada malformada al leer el registro", () => {
    const rig = custodyRig(),
      journal = new SqliteJournal(join(rig.home, "events.sqlite"), vocabulary({}));
    try {
      journal.append(
        effect("tool-entry", { tool: "vault", target: "vault", author: "ana", text: "", detail }, "ana"),
        1,
      );
      const bridge = credentialJournal(
        () =>
          journal.replay<ReturnType<typeof journal.append>[]>([], (all, event) => {
            all.push(event);
            return all;
          }),
        entry => journal.append(entry, 1),
      );
      expect(() => bridge.ledger.facts()).toThrow("E-CUSTODY-INTEGRITY");
    } finally {
      journal.close();
    }
  });

it("una transacción anidada no publica callbacks antes del commit exterior ni conserva los ya publicados", () => {
  const bridge = credentialJournal(
      () => [],
      () => undefined,
    ),
    seen: string[] = [];
  let nested = false;
  bridge.transaction(() => {
    bridge.ledger.afterCommit?.(() => {
      seen.push("outer");
      if (!nested) {
        nested = true;
        bridge.transaction(() =>
          bridge.ledger.afterCommit?.(() => {
            seen.push("follow-up");
          }),
        );
      }
    });
    bridge.transaction(() =>
      bridge.ledger.afterCommit?.(() => {
        seen.push("inner");
      }),
    );
    expect(seen).toEqual([]);
  });
  expect(seen).toEqual(["outer", "follow-up", "inner"]);
});
for (const [field, value] of [
  ["authentication", 1],
  ["batchSize", 0],
  ["batchIndex", -1],
] as const)
  it("el registro del motor valida también los campos opcionales de autenticación y lote", () => {
    const rig = custodyRig(),
      journal = new SqliteJournal(join(rig.home, "events.sqlite"), vocabulary({}));
    try {
      journal.append(
        effect(
          "tool-entry",
          {
            tool: "vault",
            target: "vault",
            author: "ana",
            text: "",
            detail: { custodyBatch: [{ ...fact("one"), [field]: value }] },
          },
          "ana",
        ),
        1,
      );
      const bridge = credentialJournal(
        () =>
          journal.replay<ReturnType<typeof journal.append>[]>([], (all, event) => {
            all.push(event);
            return all;
          }),
        entry => journal.append(entry, 1),
      );
      expect(() => bridge.ledger.facts()).toThrow("E-CUSTODY-INTEGRITY");
    } finally {
      journal.close();
    }
  });
