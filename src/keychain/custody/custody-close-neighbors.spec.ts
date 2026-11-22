import { expect, it } from "vitest";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
for (const failure of [false, true])
  it(`closing inside the callback rejects its result, even if it fails: ${failure}`, async () => {
    const store = custodyRig().open(),
      session = store.begin(custodyScope);
    const refs = { key: session.capture(Buffer.from("invented")) };
    await expect(
      store.adapter(session, []).use(refs, () => {
        store.close();
        if (failure) throw new Error("failed after closing");
        return "signature with zeros";
      }),
    ).rejects.toMatchObject({ code: "E-CUSTODY-DENIED" });
  });
it("closing erases and rejects two concurrent uses without running maintenance on the closed database", async () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("invented")) };
  let resume = () => {};
  const wait = new Promise<void>(resolve => {
    resume = resolve;
  });
  const borrowed: Uint8Array[] = [];
  const use = () =>
    store.adapter(session, []).use(refs, async values => {
      if (values.key) borrowed.push(values.key);
      await wait;
      return "ack";
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
