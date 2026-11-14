import { expect, it } from "vitest";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { fakeKeychain } from "../../../tests/support/fake-keychain.ts";
import { MacOSHouseKeys } from "./custody/macos-house-keys.ts";
import { SecretCustody } from "./custody/secret-custody.ts";
it("un uso de una referencia con un vínculo cuesta diez consultas al llavero y ninguna escritura", async () => {
  const rig = custodyRig(),
    fake = fakeKeychain();
  const store = new SecretCustody(rig.file, rig.home, new MacOSHouseKeys(fake.command));
  try {
    const session = store.begin(custodyScope),
      refs = { key: session.capture(Buffer.from("inventado")) };
    session.replace("signing", refs, 0);
    fake.calls.length = 0;
    await store.adapter(session, ["signing"]).use(refs, () => "acuse");
    expect(fake.calls).toHaveLength(10);
    expect(fake.calls.every(call => call.args[0] === "find-generic-password")).toBe(true);
    const accounts = fake.calls.map(call => call.args[call.args.indexOf("-a") + 1]);
    expect(accounts.filter(account => account?.includes("-secret-"))).toHaveLength(1);
    expect(fake.calls.filter(call => call.args.includes("desert.custody-index.v2"))).toHaveLength(4);
  } finally {
    store.close();
  }
});
