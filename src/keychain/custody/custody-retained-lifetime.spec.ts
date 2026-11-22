import { expect, it, vi } from "vitest";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { CustodyCipher } from "./custody-cipher.ts";
for (const different of [false, true])
  it("repeating an adoption erases input and comparison both on match and on rejection", () => {
    const store = custodyRig().open(),
      ref = store.keep(Buffer.from("first"));
    const input = Buffer.from(different ? "second" : "first"),
      opened = vi.spyOn(CustodyCipher.prototype, "open");
    const adopt = () => store.importLegacy(ref, input);
    if (different) expect(adopt).toThrow("E-CUSTODY-INTEGRITY");
    else expect(adopt).not.toThrow();
    expect(input.every(byte => byte === 0)).toBe(true);
    expect(opened.mock.results).toHaveLength(1);
    for (const result of opened.mock.results)
      if (result.type === "return") expect(result.value.every(byte => byte === 0)).toBe(true);
  });
it("an adoption repeated after binding keeps the same material and scope", async () => {
  const store = custodyRig().open(),
    ref = store.keep(Buffer.from("synthetic"));
  store.adopt(custodyScope, "signing", { material: ref });
  const input = Buffer.from("synthetic");
  store.importLegacy(ref, input);
  expect(input.every(byte => byte === 0)).toBe(true);
  const session = store.begin(custodyScope);
  await expect(store.adapter(session, ["signing"]).use({ material: ref }, () => "ack")).resolves.toBe("ack");
  expect(session.current("signing")?.revision).toBe(1);
});
it("retaining after close opens no storage and erases what it received", () => {
  const store = custodyRig().open(),
    input = Buffer.from("synthetic");
  store.close();
  expect(() => store.keep(input)).toThrow("E-CUSTODY-DENIED");
  expect(input.every(byte => byte === 0)).toBe(true);
});
