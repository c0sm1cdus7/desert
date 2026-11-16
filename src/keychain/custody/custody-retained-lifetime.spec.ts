import { expect, it, vi } from "vitest";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { CustodyCipher } from "./custody-cipher.ts";
for (const different of [false, true])
  it("repetir una adopción borra entrada y comparación tanto al coincidir como al rechazar", () => {
    const store = custodyRig().open(),
      ref = store.keep(Buffer.from("primero"));
    const input = Buffer.from(different ? "segundo" : "primero"),
      opened = vi.spyOn(CustodyCipher.prototype, "open");
    const adopt = () => store.importLegacy(ref, input);
    if (different) expect(adopt).toThrow("E-CUSTODY-INTEGRITY");
    else expect(adopt).not.toThrow();
    expect(input.every(byte => byte === 0)).toBe(true);
    expect(opened.mock.results).toHaveLength(1);
    for (const result of opened.mock.results)
      if (result.type === "return") expect(result.value.every(byte => byte === 0)).toBe(true);
  });
it("una adopción repetida después del vínculo conserva el mismo material y alcance", async () => {
  const store = custodyRig().open(),
    ref = store.keep(Buffer.from("sintetico"));
  store.adopt(custodyScope, "signing", { material: ref });
  const input = Buffer.from("sintetico");
  store.importLegacy(ref, input);
  expect(input.every(byte => byte === 0)).toBe(true);
  const session = store.begin(custodyScope);
  await expect(store.adapter(session, ["signing"]).use({ material: ref }, () => "acuse")).resolves.toBe("acuse");
  expect(session.current("signing")?.revision).toBe(1);
});
it("retener después de cerrar no abre almacenamiento y borra lo que recibió", () => {
  const store = custodyRig().open(),
    input = Buffer.from("sintetico");
  store.close();
  expect(() => store.keep(input)).toThrow("E-CUSTODY-DENIED");
  expect(input.every(byte => byte === 0)).toBe(true);
});
