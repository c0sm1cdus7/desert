import { expect, it } from "vitest";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { fakeKeychain } from "../../../tests/support/fake-keychain.ts";
import { MacOSHouseKeys } from "./macos-house-keys.ts";
import { SecretCustody } from "../custody/secret-custody.ts";
it("un uso de una referencia con un vínculo cuesta tres consultas al llavero y ninguna escritura", async () => {
  const rig = custodyRig(),
    fake = fakeKeychain();
  const store = new SecretCustody(rig.file, rig.home, new MacOSHouseKeys(fake.command));
  try {
    const session = store.begin(custodyScope),
      refs = { key: session.capture(Buffer.from("inventado")) };
    session.replace("signing", refs, 0);
    fake.calls.length = 0;
    await store.adapter(session, ["signing"]).use(refs, () => "acuse");
    expect(fake.calls).toHaveLength(3);
    expect(fake.calls.every(call => call.args[0] === "find-generic-password")).toBe(true);
    const accounts = fake.calls.map(call => call.args[call.args.indexOf("-a") + 1]);
    expect(accounts.filter(account => account?.includes("-secret-"))).toHaveLength(1);
    expect(fake.calls.filter(call => call.args.includes("desert.custody-anchor.v3"))).toHaveLength(1);
  } finally {
    store.close();
  }
});
it("cuenta abrir, usar, aceptar y olvidar con historia y con el índice independiente", async () => {
  for (const rotations of [1, 10]) {
    const rig = custodyRig(),
      fake = fakeKeychain(),
      keys = new MacOSHouseKeys(fake.command);
    let store = new SecretCustody(rig.file, rig.home, keys);
    let session = store.begin(custodyScope);
    for (let i = 0; i < rotations; i++)
      session.replace("signing", { key: session.capture(Buffer.from("inventado")) }, i);
    const facts = store.facts(),
      head = { count: facts.length, authentication: facts.at(-1)?.authentication ?? "" };
    store.close();
    fake.calls.length = 0;
    store = new SecretCustody(rig.file, rig.home, keys);
    const opening = fake.calls.length;
    session = store.begin(custodyScope);
    const refs = session.current("signing")?.refs ?? {};
    fake.calls.length = 0;
    await store.adapter(session, ["signing"]).use(refs, () => "acuse");
    const using = fake.calls.length;
    store.close();
    fake.calls.length = 0;
    SecretCustody.acceptRestoredCopy(rig.file, rig.home, keys, head);
    const accepting = fake.calls.length;
    store = new SecretCustody(rig.file, rig.home, keys);
    fake.calls.length = 0;
    store.forgetHouse(store.forgetWarning());
    const forgetting = fake.calls.length;
    expect({ opening, using, accepting, forgetting }).toEqual({
      opening: 5,
      using: 3,
      accepting: 8,
      forgetting: rotations + 4,
    });
    console.log(
      JSON.stringify({
        operation: "custody-cost",
        rows: facts.length,
        material: 1,
        opening,
        using,
        accepting,
        forgetting,
      }),
    );
  }
});
