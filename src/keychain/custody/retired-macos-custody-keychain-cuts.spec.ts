import { expect, it } from "vitest";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { fakeKeychain } from "../../../tests/support/fake-keychain.ts";
import { MacOSHouseKeys } from "../../../tests/support/retired-macos/macos-house-keys.ts";
import { SecretCustody } from "./secret-custody.ts";
function scenario(point = 0, after = false) {
  const rig = custodyRig(),
    fake = fakeKeychain();
  const state = { writes: 0, interrupted: false };
  const provider = new MacOSHouseKeys((file, args, input, options) => {
    const writing = args[0] === "-i" || args[0] === "add-generic-password" || args[0] === "delete-generic-password";
    const selected = writing && ++state.writes === point;
    if (selected && !after) {
      state.interrupted = true;
      throw new Error("corte");
    }
    const result = fake.command(file, args, input, options);
    if (selected && after) {
      state.interrupted = true;
      throw new Error("corte");
    }
    return result;
  });
  const store = new SecretCustody(rig.file, rig.home, provider);
  try {
    const session = store.begin(custodyScope);
    session.replace("signing", { key: session.capture(Buffer.from("uno")) }, 0);
    session.replace("signing", { key: session.capture(Buffer.from("dos")) }, 1);
    session.release("signing", 2);
  } catch (error) {
    if (!state.interrupted) throw error;
  } finally {
    store.close();
  }
  return { rig, fake, ...state };
}
it("cada escritura del comando falso se recupera antes y después de crear índice, llave, ancla o borrar", async () => {
  const dry = scenario();
  expect(dry.writes).toBeGreaterThan(10);
  const cuts = Array.from({ length: dry.writes }, (_, index) =>
    [false, true].map(after => ({ point: index + 1, after })),
  ).flat();
  for (const { point, after } of cuts) {
    const { rig, fake, interrupted } = scenario(point, after);
    expect(interrupted, `${point}/${after}`).toBe(true);
    const restored = new SecretCustody(rig.file, rig.home, new MacOSHouseKeys(fake.command));
    try {
      const session = restored.begin(custodyScope),
        current = session.current("signing");
      if (current)
        await expect(restored.adapter(session, ["signing"]).use(current.refs, () => "acuse")).resolves.toBe("acuse");
      session.replace("next", { key: session.capture(Buffer.from("continua")) }, 0);
      expect(restored.cleanupPending()).toBe(false);
    } finally {
      restored.close();
    }
  }
}, 30000);
it("un olvido parcial se retoma por identidad sin necesitar descifrar o reabrir la casa", () => {
  for (const point of [1, 2, 3, 4, 5])
    for (const after of [false, true]) {
      const fake = fakeKeychain(),
        working = new MacOSHouseKeys(fake.command);
      for (const account of ["house", "house-secret-one", "house-secret-two", "other"])
        working.key(account, true).fill(0);
      working.anchor("house", { count: 1, authentication: "a".repeat(64) });
      let deleted = 0;
      const failing = new MacOSHouseKeys((file, args, input, options) => {
        const selected = args[0] === "delete-generic-password" && ++deleted === point;
        if (selected && !after) throw new Error("corte");
        const result = fake.command(file, args, input, options);
        if (selected && after) throw new Error("corte");
        return result;
      });
      expect(() => failing.forgetHouse("house")).toThrow("E-CUSTODY-KEY");
      working.forgetHouse("house");
      for (const account of ["house", "house-secret-one", "house-secret-two"]) expect(working.has(account)).toBe(false);
      expect(working.head("house")).toBeUndefined();
      expect(working.has("other")).toBe(true);
    }
});
