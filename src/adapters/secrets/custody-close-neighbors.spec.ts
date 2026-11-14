import { expect, it } from "vitest";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
for (const failure of [false, true])
  it(`cerrar dentro del callback rechaza su resultado, incluso si falla: ${failure}`, async () => {
    const store = custodyRig().open(),
      session = store.begin(custodyScope);
    const refs = { key: session.capture(Buffer.from("inventado")) };
    await expect(
      store.adapter(session, []).use(refs, () => {
        store.close();
        if (failure) throw new Error("falló después de cerrar");
        return "firma con ceros";
      }),
    ).rejects.toMatchObject({ code: "E-CUSTODY-DENIED" });
  });
it("cerrar borra y rechaza dos usos concurrentes sin ejecutar mantenimiento sobre la base cerrada", async () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("inventado")) };
  let resume = () => {};
  const wait = new Promise<void>(resolve => {
    resume = resolve;
  });
  const borrowed: Uint8Array[] = [];
  const use = () =>
    store.adapter(session, []).use(refs, async values => {
      if (values.key) borrowed.push(values.key);
      await wait;
      return "acuse";
    });
  const first = use(),
    second = use();
  store.close();
  expect(borrowed).toHaveLength(2);
  expect(borrowed.every(buffer => buffer.every(byte => byte === 0))).toBe(true);
  resume();
  await expect(first).rejects.toMatchObject({ code: "E-CUSTODY-DENIED" });
  await expect(second).rejects.toMatchObject({ code: "E-CUSTODY-DENIED" });
});
