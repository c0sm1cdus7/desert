import { expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { realpathSync } from "node:fs";
import { Redactor } from "../keychain/redact.ts";
import { SecretVault } from "../keychain/secret-vault.ts";
import { SecretCustody } from "../keychain/custody/secret-custody.ts";
import { secretRef } from "../keychain/custody/custody-database.ts";
import { custodyRig, custodyScope } from "../../tests/support/custody-rig.ts";
import { effect } from "../house/facts.ts";
import { vocabulary } from "./vocabulary.ts";
import type { Program } from "../tools/tool-contract.ts";
const field = Type.String({ secret: true });
const schema = Type.Object({ first: field, second: field });
it("cada posición del ingreso y cada escritura obtiene su referencia y se libera por separado", async () => {
  const rig = custodyRig();
  const vault = new SecretVault<Program>(rig.file, vocabulary({}).event, rig.keys);
  const refs: string[] = [];
  try {
    vault.scope(schema, { first: "igual", second: "igual" }, prepared => {
      if (!prepared || typeof prepared !== "object") throw new Error("Falta ingreso");
      refs.push(String(Reflect.get(prepared, "first")), String(Reflect.get(prepared, "second")));
      for (let i = 0; i < 2; i++) {
        const written = vault.write(
          effect(
            "act",
            {
              object: "vault",
              option: "set",
              input: { first: "igual", second: "igual" },
            },
            "ana",
          ),
        );
        const input = written.data.input;
        if (!input || typeof input !== "object") throw new Error("Falta entrada");
        refs.push(String(Reflect.get(input, "first")), String(Reflect.get(input, "second")));
      }
    });
    expect(new Set(refs).size).toBe(6);
    expect(refs.every(secretRef)).toBe(true);
  } finally {
    vault.close();
  }
  const store = new SecretCustody(rig.file, realpathSync(rig.home), rig.keys);
  try {
    expect(store.ids().sort()).toEqual([...refs].sort());
    for (const [index, ref] of refs.entries()) {
      if (!secretRef(ref)) throw new Error("Referencia inválida");
      store.adopt(custodyScope, `slot-${index}`, { key: ref });
    }
    const session = store.begin(custodyScope);
    const first = session.current("slot-0");
    const second = session.current("slot-1");
    if (!first || !second) throw new Error("Falta vínculo");
    session.release("slot-0", 1);
    expect(store.ids()).not.toContain(first.refs.key);
    expect(
      await store
        .adapter(session, ["slot-1"])
        .use(second.refs, material => Buffer.from(material.key ?? []).toString("utf8")),
    ).toBe("igual");
    for (let i = 1; i < 6; i++) session.release(`slot-${i}`, 1);
    expect(store.ids()).toEqual([]);
  } finally {
    store.close();
  }
});
it("una entrada malformada se omite entera sin ingresar textos públicos ni secretos a custodia", () => {
  const save = vi.fn(() => "secret:00000000-0000-0000-0000-000000000000");
  const redactor = new Redactor<Program>(vocabulary({}).event, save);
  const input = { first: "válido", second: { text: "fragmento", number: 987654321 } };
  const written = redactor.scope(schema, input, () =>
    redactor.write(
      effect(
        "act",
        {
          object: "vault",
          option: "set",
          input,
        },
        "ana",
      ),
    ),
  );
  expect(written.data.input).toBe("[secret]");
  expect(save).not.toHaveBeenCalled();
});
