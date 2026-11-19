import { expect, it } from "vitest";
import { fakeKeychain } from "../../../tests/support/fake-keychain.ts";
import { MacOSHouseKeys } from "../../../tests/support/retired-macos/macos-house-keys.ts";
it("rechaza un ejecutor que no devuelve un búfer antes de interpretar su respuesta", () => {
  const malformed = Buffer.alloc(0);
  Object.setPrototypeOf(malformed, null);
  const provider = new MacOSHouseKeys(() => ({ status: 0, stdout: malformed }));
  expect(() => provider.has("house")).toThrow("E-CUSTODY-KEY");
});
it("una escritura con estado de error no se acepta aunque haya dejado un elemento legible", () => {
  const fake = fakeKeychain();
  const provider = new MacOSHouseKeys((file, args, input, options) => {
    const result = fake.command(file, args, input, options);
    return { ...result, status: args[0] === "-i" ? 1 : result.status };
  });
  expect(() => provider.key("house", true)).toThrow("E-CUSTODY-KEY");
});
it("borra también las respuestas no vacías de escribir, consultar presencia y eliminar", () => {
  const fake = fakeKeychain(),
    outputs: Uint8Array[] = [];
  const provider = new MacOSHouseKeys((file, args, input, options) => {
    const result = fake.command(file, args, input, options);
    if (!args.includes("-w")) {
      const stdout = Buffer.from("METADATA_SINTETICA");
      outputs.push(stdout);
      return { ...result, stdout };
    }
    return result;
  });
  provider.key("house", true).fill(0);
  provider.anchor("house", { count: 0, authentication: "" });
  expect(provider.has("house")).toBe(true);
  provider.forget("house");
  expect(outputs.length).toBeGreaterThanOrEqual(4);
  expect(outputs.every(output => output.every(byte => byte === 0))).toBe(true);
});
it("un índice legible con estado de error no se acepta como un ancla válida", () => {
  const fake = fakeKeychain();
  const working = new MacOSHouseKeys(fake.command);
  working.anchor("house", { count: 1, authentication: "a".repeat(64) });
  const failing = new MacOSHouseKeys((file, args, input, options) => {
    const result = fake.command(file, args, input, options);
    return { ...result, status: 1 };
  });
  expect(() => failing.head("house")).toThrow("E-CUSTODY-KEY");
});
it("borrar con un estado distinto de éxito o ausencia falla con un error cerrado", () => {
  const stdout = Buffer.from("SINTETICO"),
    provider = new MacOSHouseKeys(() => ({ status: 1, stdout }));
  expect(() => provider.forget("house")).toThrow("E-CUSTODY-KEY");
  expect(stdout.every(byte => byte === 0)).toBe(true);
});
for (const index of [
  null,
  1,
  {},
  { accounts: {} },
  { accounts: [1] },
  { accounts: [], head: null },
  { accounts: [], head: { count: -1, authentication: "" } },
  { accounts: [], head: { count: 1.5, authentication: "" } },
  { accounts: [], head: { count: 0, authentication: 1 } },
])
  it("rechaza la estructura inválida del índice externo con un error cerrado", () => {
    const stdout = Buffer.from(Buffer.from(JSON.stringify(index)).toString("hex"));
    const provider = new MacOSHouseKeys(() => ({ status: 0, stdout }));
    expect(() => provider.head("house")).toThrow("E-CUSTODY-KEY");
    expect(stdout.every(byte => byte === 0)).toBe(true);
  });
it("una llave de tamaño válido con estado de error no se presta", () => {
  const stdout = Buffer.from(Buffer.alloc(32, 17).toString("base64"));
  const provider = new MacOSHouseKeys(() => ({ status: 1, stdout }));
  expect(() => provider.key("house", false)).toThrow("E-CUSTODY-KEY");
  expect(stdout.every(byte => byte === 0)).toBe(true);
});
it("crear borra también la respuesta inicial de ausencia antes de volver a leer", () => {
  const fake = fakeKeychain(),
    outputs: Uint8Array[] = [];
  const provider = new MacOSHouseKeys((file, args, input, options) => {
    const result = fake.command(file, args, input, options);
    const stdout = result.status === 44 ? Buffer.from("AUSENCIA_SINTETICA") : result.stdout;
    outputs.push(stdout);
    return { ...result, stdout };
  });
  provider.key("house", true).fill(0);
  expect(outputs.every(output => output.every(byte => byte === 0))).toBe(true);
});
it("retomar la creación de una cuenta ya registrada no vuelve a agregarla al índice", () => {
  const fake = fakeKeychain(),
    provider = new MacOSHouseKeys(fake.command);
  provider.key("house", true).fill(0);
  provider.forget("house");
  fake.calls.length = 0;
  provider.key("house", true).fill(0);
  expect(fake.calls.filter(call => call.args[0] === "-i")).toHaveLength(1);
});
it("olvidar una casa elimina su llave del registro además de las llaves de secretos", () => {
  const fake = fakeKeychain(),
    provider = new MacOSHouseKeys(fake.command);
  for (const account of ["house", "house-secret-one", "other"]) provider.key(account, true).fill(0);
  provider.anchor("house", { count: 1, authentication: "a".repeat(64) });
  provider.forgetHouse("house");
  expect(provider.has("house")).toBe(false);
  expect(provider.has("house-secret-one")).toBe(false);
  expect(provider.has("other")).toBe(true);
  expect(provider.head("house")).toBeUndefined();
});
