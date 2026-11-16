import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { custodyRig, custodyScope as scope } from "../../tests/support/custody-rig.ts";
import { adapterProgram, call, imported, signer, synthetic } from "../../tests/support/declared-adapters.ts";
import { declaredAdapters } from "./compose-adapters.ts";

it("la composición presta métodos, mantiene revisión inicial y deja hechos sin valores", async () => {
  const r = custodyRig(),
    store = r.open();
  const compose = declaredAdapters(adapterProgram, ["vault"]);
  const first = compose(store, () => true)(scope);
  const refs = await imported(first);
  expect(await call(first, "inspect", refs)).toEqual({ valid: true });
  const change = first.credentials.replace("signing", refs, 0);
  expect(store.facts()).toEqual([]);
  expect(first.apply(change, true)).toBe(true);
  expect(first.credentials.current("signing")).toBeUndefined();
  expect(first.credentials.revision("signing")).toBe(0);
  first.close();
  store.close();
  const reopened = r.open(),
    next = compose(reopened, () => true)(scope);
  expect(next.credentials.current("signing")).toEqual({ revision: 1, refs });
  expect(await call(next, "inspect", refs)).toEqual({ valid: true });
  const changed = next.credentials.current("signing");
  if (changed) Object.assign(changed.refs, { key: "secret:inventada" });
  expect(next.credentials.current("signing")?.refs).toEqual(refs);
  next.apply(next.credentials.release("signing", 1), true);
  next.close();
  expect(reopened.ids()).toEqual([]);
  expect(JSON.stringify(reopened.facts())).not.toContain(synthetic);
  expect(reopened.facts().map(f => f.kind)).toContain("credential-released");
  next.close();
});
it("cancelar o reiniciar recoge el ingreso de un adaptador", async () => {
  const r = custodyRig(),
    store = r.open();
  const create = declaredAdapters(adapterProgram, ["vault"]);
  const first = create(store, () => true)(scope);
  await imported(first);
  first.close();
  expect(store.ids()).toEqual([]);
  const abandoned = create(store, () => true)(scope);
  const refs = await imported(abandoned);
  store.close();
  const restarted = r.open(),
    next = create(restarted, () => true)(scope);
  expect(restarted.ids()).toEqual([]);
  await expect(call(next, "inspect", refs)).rejects.toMatchObject({ code: "E-ADAPTER-FAILED" });
  next.close();
});
it("cada método limita herramientas y vínculos; otra identidad, objeto o casa no resuelve", async () => {
  const store = custodyRig().open(),
    create = declaredAdapters(adapterProgram, ["vault"]);
  const first = create(store, () => true)(scope),
    refs = await imported(first);
  first.apply(first.credentials.replace("backup", refs, 0), true);
  await expect(call(first, "inspect", refs)).rejects.toThrow("E-ADAPTER-FAILED");
  first.apply(first.credentials.replace("signing", refs, 0), true);
  for (const other of [
    { ...scope, actor: "bea" },
    { ...scope, target: "otro" },
  ]) {
    const next = create(store, () => true)(other);
    await expect(call(next, "inspect", refs)).rejects.toThrow("E-ADAPTER-FAILED");
    next.close();
  }
  const elsewhere = create(custodyRig().open(), () => true)(scope);
  await expect(call(elsewhere, "inspect", refs)).rejects.toThrow("E-ADAPTER-FAILED");
  elsewhere.close();
  const stranger = create(store, () => true)({ ...scope, tool: "other" });
  expect(stranger.ports.signer).toEqual({});
  expect(() => stranger.credentials.current("signing")).toThrow("E-ADAPTER-DENIED");
  stranger.close();
  first.close();
});
it("dos acciones conservan su revisión; revocar permisos y cerrar revoca métodos guardados", async () => {
  const store = custodyRig().open(),
    create = declaredAdapters(adapterProgram, ["vault"]);
  let allowed = true;
  const first = create(store, () => allowed)(scope),
    second = create(store, () => true)(scope);
  const a = await imported(first),
    b = await imported(second);
  first.apply(first.credentials.replace("signing", a, first.credentials.revision("signing")), true);
  expect(() =>
    second.apply(second.credentials.replace("signing", b, second.credentials.revision("signing")), true),
  ).toThrow("E-CUSTODY-CONFLICT");
  second.close();
  expect(store.ids()).toEqual([a.key]);
  allowed = false;
  await expect(call(first, "inspect", a)).rejects.toThrow("E-ADAPTER-DENIED");
  first.close();
  allowed = true;
  await expect(call(first, "inspect", a)).rejects.toThrow("E-ADAPTER-DENIED");
});
it("declaraciones inválidas fallan al componer, antes de llamar a la fábrica", () => {
  for (const method of [
    { input: Type.Unknown(), output: Type.Boolean(), permissions: { tools: ["vault"], slots: [], capture: false } },
    { input: Type.Object({}), output: Type.Unknown(), permissions: { tools: ["vault"], slots: [], capture: false } },
    { input: Type.Object({}), output: Type.Boolean(), permissions: { tools: ["other"], slots: [], capture: false } },
    {
      input: Type.Object({}),
      output: Type.Boolean(),
      permissions: { tools: ["vault"], slots: ["other"], capture: false },
    },
  ])
    expect(() =>
      declaredAdapters({ ...adapterProgram, adapters: { signer: { ...signer, methods: { inspect: method } } } }, [
        "vault",
      ]),
    ).toThrow("E-ADAPTER-DECLARATION");
});
it("la composición fija esquemas y permisos aunque el programa cambie su declaración", async () => {
  const input = Type.Object({}),
    output = Type.Object({ valid: Type.Boolean() });
  const tools = ["vault"],
    slots = ["signing"];
  const create = declaredAdapters(
    {
      ...adapterProgram,
      adapters: {
        signer: {
          methods: { inspect: { input, output, permissions: { tools, slots, capture: false } } },
          open: () => ({ inspect: () => ({ valid: true }) }),
        },
      },
    },
    ["vault"],
  );
  tools.splice(0);
  slots.push("other");
  const required: string[] = output.required;
  required.push("new");
  const lease = create(custodyRig().open(), () => true)(scope);
  expect(await call(lease, "inspect", {})).toEqual({ valid: true });
  lease.close();
});
