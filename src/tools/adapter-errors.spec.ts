import { expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { Type } from "@sinclair/typebox";
import { custodyRig, custodyScope as scope } from "../../tests/support/custody-rig.ts";
import {
  adapterProgram,
  call,
  imported,
  signer,
  synthetic,
  references,
  permissions,
} from "../../tests/support/declared-adapters.ts";
import { declaredAdapters } from "../adapters/compose-adapters.ts";
import type { AdapterDeclaration, SecretResolver } from "./adapter-contract.ts";

function composed(adapter: AdapterDeclaration) {
  const store = custodyRig().open();
  const create = declaredAdapters({ ...adapterProgram, adapters: { signer: adapter } }, ["vault"]);
  return { store, lease: create(store, () => true)(scope) };
}
for (const mode of ["factory", "sync", "async", "thenable"] as const)
  it(`una falla ${mode} sale como código cerrado sin mensaje, causa ni traza originales`, async () => {
    const fail = () => {
      throw new Error(synthetic.replaceAll("\n", "|"), { cause: new Error(synthetic) });
    };
    const adapter: AdapterDeclaration = {
      ...signer,
      open: () => {
        if (mode === "factory") fail();
        return {
          inspect: () => {
            if (mode === "sync") fail();
            if (mode === "async") return Promise.reject(new Error(synthetic));
            return { then: fail };
          },
        };
      },
    };
    const { lease } = composed(adapter);
    await expect(call(lease, "inspect", { key: "secret:inventada" })).rejects.toMatchObject({
      code: "E-ADAPTER-FAILED",
      message: "E-ADAPTER-FAILED",
      stack: "E-ADAPTER-FAILED",
    });
    try {
      await call(lease, "inspect", { key: "secret:inventada" });
    } catch (error) {
      expect(error).not.toHaveProperty("cause");
      expect(String(error)).not.toContain(synthetic);
    }
    lease.close();
  });
for (const result of [
  { valid: "yes" },
  { valid: true, material: synthetic },
  new Error(synthetic),
  { valid: true, resolve: () => synthetic },
  {
    get valid() {
      throw new Error(synthetic);
    },
  },
])
  it("rechaza salida inválida, campos extra, capacidades y getters sin transportarlos", async () => {
    const { lease } = composed({ ...signer, open: () => ({ inspect: () => result }) });
    await expect(call(lease, "inspect", { key: "secret:inventada" })).rejects.toThrow("E-ADAPTER-OUTPUT");
    lease.close();
  });
it("valida entrada antes de abrir y no ofrece métodos que la fábrica no declaró", async () => {
  let opens = 0;
  const { lease } = composed({
    ...signer,
    open: resolver => {
      opens++;
      return {
        ...signer.open(resolver),
        hidden: () => resolver,
      };
    },
  });
  await expect(call(lease, "inspect", { key: 42 })).rejects.toThrow("E-ADAPTER-INPUT");
  await expect(call(lease, "inspect", { key: "secret:inventada", extra: true })).rejects.toThrow("E-ADAPTER-INPUT");
  expect(opens).toBe(0);
  expect(lease.ports.signer).not.toHaveProperty("hidden");
  lease.close();
});
it("la fábrica no puede usar un resolvedor guardado después de terminar su operación", async () => {
  let resolver: SecretResolver | undefined;
  const { lease } = composed({
    ...signer,
    open: value => {
      resolver = value;
      return signer.open(value);
    },
  });
  const refs = await imported(lease);
  expect(() => resolver?.capture(Buffer.from(synthetic))).toThrow("E-ADAPTER-DENIED");
  expect(() => resolver?.use(refs, () => true)).toThrow("E-ADAPTER-DENIED");
  lease.close();
});
it("cada operación tiene su permiso de ingreso, aunque otra del adaptador pueda ingresar", async () => {
  const { lease, store } = composed({
    ...signer,
    methods: {
      ...signer.methods,
      import: { input: Type.Object({}), output: Type.Object({}), permissions: { ...permissions, capture: false } },
    },
  });
  await expect(imported(lease)).rejects.toThrow("E-ADAPTER-FAILED");
  expect(store.ids()).toEqual([]);
  lease.close();
});
it("un uso en curso conserva la versión retirada y las llamadas siguientes ya no la reciben", async () => {
  let release = () => {};
  const waiting = new Promise<void>(resolve => {
    release = resolve;
  });
  const adapter: AdapterDeclaration = {
    ...signer,
    open: resolver => ({
      ...signer.open(resolver),
      inspect: input => {
        if (!Value.Check(references, input)) throw new Error("fixture input");
        return resolver.use(input, async material => {
          await waiting;
          return { valid: Buffer.from(material.key ?? []).toString("utf8") === synthetic };
        });
      },
    }),
  };
  const { lease, store } = composed(adapter);
  const refs = await imported(lease);
  lease.apply(lease.credentials.replace("signing", refs, 0), true);
  const pending = call(lease, "inspect", refs);
  lease.apply(lease.credentials.release("signing", 1), true);
  store.collect();
  expect(store.ids()).toContain(refs.key);
  release();
  expect(await pending).toEqual({ valid: true });
  expect(store.ids()).not.toContain(refs.key);
  await expect(call(lease, "inspect", refs)).rejects.toThrow("E-ADAPTER-FAILED");
  lease.close();
});
