import { expect, it } from "vitest";
import { custodyHead, custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { fakeKeychain } from "../../../tests/support/fake-keychain.ts";
import { MacOSHouseKeys } from "../../../tests/support/retired-macos/macos-house-keys.ts";
import { SecretCustody } from "./secret-custody.ts";
const indexId = (fake: ReturnType<typeof fakeKeychain>) =>
  [...fake.saved.keys()].find(id => id.includes("custody-index")) ?? "";
it("300 altas simultáneas y 300 purgas no cortan el índice ni hacen crecer el ancla", () => {
  const fake = fakeKeychain(),
    keys = new MacOSHouseKeys(fake.command);
  for (let i = 0; i < 300; i++) keys.key(`house-secret-${i}`, true).fill(0);
  keys.anchor("house", { count: 900, authentication: "a".repeat(64) });
  expect(keys.head("house")?.count).toBe(900);
  const anchor = [...fake.saved.entries()].find(([id]) => id.includes("custody-anchor"));
  expect(anchor?.[1].length).toBe(81);
  for (let i = 0; i < 300; i++) keys.forget(`house-secret-${i}`);
  const index: unknown = JSON.parse(
    Buffer.from(Buffer.from(fake.saved.get(indexId(fake)) ?? []).toString(), "hex").toString(),
  );
  expect(index).toEqual({ accounts: [] });
  expect(keys.head("house")?.count).toBe(900);
});
for (const damage of ["lost", "broken", "omitted", "foreign", "malformed-account"])
  it(`olvidar enumera la carpeta y protege otra casa con índice ${damage}`, () => {
    const rig = custodyRig(),
      fake = fakeKeychain(),
      keys = new MacOSHouseKeys(fake.command);
    const store = new SecretCustody(rig.file, rig.home, keys),
      session = store.begin(custodyScope);
    const ref = session.capture(Buffer.from("inventado"));
    session.replace("signing", { key: ref }, 0);
    keys.key("other-secret-one", true).fill(0);
    const id = indexId(fake);
    if (damage === "lost") fake.saved.delete(id);
    else
      fake.saved.set(
        id,
        Buffer.from(
          damage === "broken"
            ? "broken"
            : Buffer.from(JSON.stringify({ accounts: damage === "foreign" ? ["other-secret-one"] : [] })).toString(
                "hex",
              ),
        ),
      );
    if (damage === "malformed-account")
      fake.saved.set(
        id,
        Buffer.from(
          Buffer.from(JSON.stringify({ accounts: [`${id.split("/")[1] ?? ""}-secret-\nbad`] })).toString("hex"),
        ),
      );
    store.close();
    const reopened = new SecretCustody(rig.file, rig.home, keys);
    reopened.forgetHouse(reopened.forgetWarning());
    expect([...fake.saved.keys()].some(id => id.includes(ref.slice(7)))).toBe(false);
    expect(keys.has("other-secret-one")).toBe(true);
  });
it("aceptar recrea un ancla perdida después de verificar", () => {
  const rig = custodyRig(),
    fake = fakeKeychain(),
    keys = new MacOSHouseKeys(fake.command);
  const store = new SecretCustody(rig.file, rig.home, keys),
    session = store.begin(custodyScope);
  session.replace("signing", { key: session.capture(Buffer.from("inventado")) }, 0);
  const head = custodyHead(store.facts());
  store.close();
  for (const id of fake.saved.keys())
    if (id.includes("custody-anchor") || id.includes("custody-index")) fake.saved.delete(id);
  expect(() => new SecretCustody(rig.file, rig.home, keys)).toThrow("E-CUSTODY-KEY");
  SecretCustody.acceptRestoredCopy(rig.file, rig.home, keys, head);
  new SecretCustody(rig.file, rig.home, keys).close();
});
it("el falso corta en 4095 bytes y ejecuta el resto como otra orden", () => {
  const fake = fakeKeychain();
  const prefix = "add-generic-password -s synthetic -a first -w ";
  const first = prefix + "x".repeat(4095 - prefix.length);
  const result = fake.command(
    "fake",
    ["-i"],
    Buffer.from(first + "add-generic-password -s synthetic -a second -w next\n"),
    { timeout: 5000 },
  );
  expect(result.status).toBe(0);
  expect(fake.saved.get("synthetic/first")?.length).toBe(4095 - prefix.length);
  expect(Buffer.from(fake.saved.get("synthetic/second") ?? []).toString()).toBe("next");
});
it("el índice fuera de tamaño falla antes de sobrescribirlo o crear una llave", () => {
  const fake = fakeKeychain(),
    keys = new MacOSHouseKeys(fake.command);
  keys.key("house-secret-first", true).fill(0);
  const id = indexId(fake);
  const full = Buffer.from(
    Buffer.from(
      JSON.stringify({ accounts: Array.from({ length: 1000 }, (_, i) => `house-secret-${i}-${"x".repeat(80)}`) }),
    ).toString("hex"),
  );
  fake.saved.set(id, full);
  const before = fake.calls.length;
  expect(() => keys.key("house-secret-next", true)).toThrow("E-CUSTODY-KEY");
  expect(fake.saved.get(id)).toEqual(full);
  expect(fake.calls.slice(before).every(call => call.args[0] === "find-generic-password")).toBe(true);
});
it("poda solamente después de borrar la llave; una falla de poda se puede reintentar", () => {
  const fake = fakeKeychain(),
    working = new MacOSHouseKeys(fake.command);
  working.key("house-secret-first", true).fill(0);
  let failDelete = true;
  const failing = new MacOSHouseKeys((file, args, input, options) => {
    if ((failDelete && args[0] === "delete-generic-password") || (!failDelete && args[0] === "add-generic-password"))
      return { status: 1, stdout: Buffer.alloc(0) };
    return fake.command(file, args, input, options);
  });
  const before = Buffer.from(fake.saved.get(indexId(fake)) ?? []);
  expect(() => failing.forget("house-secret-first")).toThrow();
  expect(working.has("house-secret-first")).toBe(true);
  expect(fake.saved.get(indexId(fake))).toEqual(before);
  failDelete = false;
  expect(() => failing.forget("house-secret-first")).toThrow();
  expect(working.has("house-secret-first")).toBe(false);
  working.forget("house-secret-first");
  expect(Buffer.from(fake.saved.get(indexId(fake)) ?? []).toString()).not.toBe(before.toString());
});
it("300 rotaciones dejan una sola cuenta viva; abrir y olvidar siguen funcionando", () => {
  const rig = custodyRig(),
    fake = fakeKeychain(),
    keys = new MacOSHouseKeys(fake.command);
  const store = new SecretCustody(rig.file, rig.home, keys),
    session = store.begin(custodyScope);
  for (let i = 0; i < 300; i++) {
    session.replace("signing", { key: session.capture(Buffer.from("inventado")) }, i);
    expect([...fake.saved.keys()].filter(id => id.includes("-secret-"))).toHaveLength(1);
    expect(fake.calls.filter(call => call.args[0] === "-i").every(call => call.input.length <= 4096)).toBe(true);
    fake.calls.length = 0;
  }
  store.close();
  const again = new SecretCustody(rig.file, rig.home, keys);
  again.forgetHouse(again.forgetWarning());
  expect(fake.saved.size).toBe(0);
}, 30000);
it("olvidar encuentra también la llave pendiente cuya fila ya se borró y cuyo índice se perdió", () => {
  const rig = custodyRig(),
    fake = fakeKeychain(),
    keys = new MacOSHouseKeys(fake.command);
  let failing = false;
  const provider = new MacOSHouseKeys((file, args, input, options) => {
    if (failing && args[0] === "delete-generic-password") return { status: 1, stdout: Buffer.alloc(0) };
    return fake.command(file, args, input, options);
  });
  const store = new SecretCustody(rig.file, rig.home, provider),
    session = store.begin(custodyScope);
  const ref = session.capture(Buffer.from("inventado"));
  session.replace("signing", { key: ref }, 0);
  failing = true;
  expect(() => session.release("signing", 1)).toThrow("E-CUSTODY-CLEANUP");
  expect(store.ids()).toEqual([]);
  fake.saved.delete(indexId(fake));
  failing = false;
  store.forgetHouse(store.forgetWarning());
  expect([...fake.saved.keys()].some(id => id.includes(ref.slice(7)))).toBe(false);
  expect(keys.head("other")).toBeUndefined();
});
it("el formato v2 no se convierte ni se toca al pedir una llave v3 ausente", () => {
  const fake = fakeKeychain(),
    keys = new MacOSHouseKeys(fake.command);
  const old = Buffer.from("SINTETICO_V2");
  fake.saved.set("desert.house-custody.v2/house", old);
  expect(() => keys.key("house", false)).toThrow("E-CUSTODY-KEY");
  expect(fake.saved.size).toBe(1);
  expect(fake.saved.get("desert.house-custody.v2/house")).toEqual(old);
});
