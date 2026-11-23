import { join } from "node:path";
import { expect, it } from "vitest";
import { custodyRig, custodyScope } from "../../tests/support/custody-rig.ts";
import { fakeKeychain } from "../../tests/support/fake-keychain.ts";
import { MacOSHouseKeys } from "../../tests/support/retired-macos/macos-house-keys.ts";
import { vocabulary } from "../journal/vocabulary.ts";
import { SecretCustody } from "../keychain/custody/secret-custody.ts";
import { SqliteJournal } from "../storage/journal-store.ts";
import { credentialJournal } from "./credential-journal.ts";
it("releasing through the API inside a transaction rejects the second addition before the commit", () => {
  const rig = custodyRig(),
    journal = new SqliteJournal(join(rig.home, "events.sqlite"), vocabulary({}));
  try {
    const bridge = credentialJournal(
      () => journal.replay<ReturnType<typeof journal.append>[]>([], (all, event) => [...all, event]),
      entry => journal.append(entry, 1),
    );
    const store = rig.open(bridge.ledger),
      session = store.begin(custodyScope);
    const refs = { key: session.capture(Buffer.from("invented")) };
    session.replace("signing", refs, 0);
    const before = store.facts();
    expect(() => bridge.transaction(() => journal.batch(() => session.release("signing", 1)))).toThrow(
      /E-CUSTODY-TRANSACTION.*aggregate/u,
    );
    expect(store.facts()).toEqual(before);
    expect(session.current("signing")?.refs).toEqual(refs);
    store.close();
    expect(rig.open(bridge.ledger).begin(custodyScope).current("signing")?.refs).toEqual(refs);
  } finally {
    journal.close();
  }
});
for (const status of [null, 44])
  it(`custody keeps the binding with a pending ${status} anchor and retries on read`, () => {
    const rig = custodyRig(),
      fake = fakeKeychain();
    let fail = false;
    const keys = new MacOSHouseKeys((file, args, input, options) => {
      if (fail && args[0] === "-i" && Buffer.from(input).includes("desert.custody-anchor.v3"))
        return { status, stdout: Buffer.alloc(0) };
      return fake.command(file, args, input, options);
    });
    const store = new SecretCustody(rig.file, rig.home, keys);
    try {
      const session = store.begin(custodyScope),
        refs = { key: session.capture(Buffer.from("invented")) };
      fail = true;
      expect(() => session.replace("signing", refs, 0)).not.toThrow();
      expect(store.anchorPending()).toBe(true);
      expect(session.current("signing")?.refs).toEqual(refs);
      expect(() => session.replace("backup", refs, 0)).toThrow("E-CUSTODY-KEY");
      fail = false;
      expect(session.current("signing")?.refs).toEqual(refs);
      expect(store.anchorPending()).toBe(false);
      session.replace("backup", refs, 0);
    } finally {
      store.close();
    }
  });
it("an opening with the anchor still pending shows the notice and the next read resolves it", () => {
  const rig = custodyRig(),
    fake = fakeKeychain();
  let fail = false;
  const keys = new MacOSHouseKeys((file, args, input, options) => {
    if (fail && args[0] === "-i" && Buffer.from(input).includes("desert.custody-anchor.v3"))
      return { status: null, stdout: Buffer.alloc(0) };
    return fake.command(file, args, input, options);
  });
  const first = new SecretCustody(rig.file, rig.home, keys),
    session = first.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("invented")) };
  fail = true;
  session.replace("signing", refs, 0);
  first.close();
  const again = new SecretCustody(rig.file, rig.home, keys);
  try {
    expect(again.anchorPending()).toBe(true);
    expect(again.begin(custodyScope).current("signing")?.refs).toEqual(refs);
    fail = false;
    expect(again.facts()).toHaveLength(1);
    expect(again.anchorPending()).toBe(false);
  } finally {
    again.close();
  }
});
it("rejects two explicit batches before the commit, and the next attempt does not inherit the rejected one", () => {
  const rig = custodyRig(),
    journal = new SqliteJournal(join(rig.home, "events.sqlite"), vocabulary({}));
  try {
    const bridge = credentialJournal(
      after => journal.replay<ReturnType<typeof journal.append>[]>([], (all, event) => [...all, event], after),
      entry => journal.append(entry, 1),
    );
    const store = rig.open(bridge.ledger),
      session = store.begin(custodyScope);
    const refs = { key: session.capture(Buffer.from("invented")) };
    expect(() =>
      bridge.transaction(() =>
        journal.batch(() => {
          store.deferCleanup(() => store.confirm(session, "signing", 0, refs));
          store.deferCleanup(() => store.confirm(session, "backup", 0, refs));
        }),
      ),
    ).toThrow("E-CUSTODY-TRANSACTION");
    expect(store.facts()).toEqual([]);
    bridge.transaction(() =>
      journal.batch(() =>
        store.deferCleanup(() => {
          store.confirm(session, "signing", 0, refs);
          store.confirm(session, "backup", 0, refs);
        }),
      ),
    );
    expect(store.facts().map(fact => fact.batchSize)).toEqual([2, 2]);
    store.close();
    expect(rig.open(bridge.ledger).begin(custodyScope).current("signing")?.refs).toEqual(refs);
  } finally {
    journal.close();
  }
});
