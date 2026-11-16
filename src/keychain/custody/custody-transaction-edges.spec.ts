import { expect, it, vi } from "vitest";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { AuthenticatedLedger } from "./authenticated-ledger.ts";
import { CustodyCipher } from "./custody-cipher.ts";
import { CustodyDatabase } from "./custody-database.ts";
import type { CredentialFact } from "./custody-contract.ts";
const fact = (id: string): CredentialFact => ({
  id,
  kind: "credential-bound",
  actor: "ana",
  tool: "vault",
  target: "vault",
  slot: id,
  revision: 1,
  refs: {},
  cause: "test",
});
it("el registro simple rechaza un lote múltiple antes de escribir una parte", () => {
  const rig = custodyRig(),
    cipher = new CustodyCipher("house", rig.keys),
    rows: CredentialFact[] = [];
  cipher.prepare(true);
  const ledger = new AuthenticatedLedger(
    {
      facts: () => rows,
      append: row => {
        rows.push(row);
      },
    },
    cipher,
  );
  expect(() =>
    ledger.batch(() => {
      ledger.append(fact("one"));
      ledger.append(fact("two"));
    }),
  ).toThrow("E-CUSTODY-STORAGE");
  expect(rows).toEqual([]);
  ledger.append(fact("three"));
  expect(ledger.facts().map(row => row.id)).toEqual(["three"]);
});
it("anidar un lote conserva todas las filas y descartar uno permite volver a escribir", () => {
  const rig = custodyRig(),
    cipher = new CustodyCipher("house", rig.keys),
    rows: CredentialFact[] = [];
  cipher.prepare(true);
  const ledger = new AuthenticatedLedger(
    {
      facts: () => rows,
      append: row => {
        rows.push(row);
      },
      appendBatch: batch => {
        rows.push(...batch);
      },
    },
    cipher,
  );
  expect(() =>
    ledger.batch(() => {
      ledger.append(fact("rollback"));
      throw new Error("rollback");
    }),
  ).toThrow("rollback");
  ledger.batch(() => {
    ledger.append(fact("one"));
    ledger.batch(() => ledger.append(fact("two")));
    ledger.append(fact("three"));
  });
  expect(ledger.facts().map(row => [row.id, row.batchSize, row.batchIndex])).toEqual([
    ["one", 3, 0],
    ["two", 3, 1],
    ["three", 3, 2],
  ]);
  expect(rig.keys.head("house")?.count).toBe(3);
});
it("vincular comprueba de nuevo el sobre y la presencia de su llave después de abrir", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("sintetico")) };
  const row = vi.spyOn(CustodyDatabase.prototype, "row"),
    presence = vi.spyOn(rig.keys, "has");
  session.replace("one", refs, 0);
  const stored = row.mock.results.flatMap(result =>
    result.type === "return" && result.value ? [result.value] : [],
  )[0];
  if (!stored?.payload) throw new Error("fixture");
  row.mockReturnValue({ ...stored, payload: stored.payload + "." });
  expect(() => session.replace("two", refs, 0)).toThrow("E-CUSTODY-INTEGRITY");
  expect(() => store.deferCleanup(() => store.confirm(session, "two", 0, refs))).toThrow("E-CUSTODY-INTEGRITY");
  row.mockRestore();
  const account = presence.mock.calls[0]?.[0];
  if (!account) throw new Error("fixture");
  rig.keys.forget(account);
  expect(() => session.replace("two", refs, 0)).toThrow("E-CUSTODY-KEY");
  expect(() => store.deferCleanup(() => store.confirm(session, "two", 0, refs))).toThrow("E-CUSTODY-KEY");
});
it("terminar un uso retira el búfer de la custodia, no lo conserva hasta cerrar", async () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("sintetico")) };
  let fillCount = () => 0;
  await store.adapter(session, []).use(refs, values => {
    if (!values.key) throw new Error("fixture");
    const fills = vi.spyOn(values.key, "fill");
    fillCount = () => fills.mock.calls.length;
  });
  expect(fillCount()).toBe(1);
  store.close();
  expect(fillCount()).toBe(1);
});
it("si falla la segunda fila del agregado SQLite descarta también la primera y admite el próximo", () => {
  const rig = custodyRig(),
    db = new CustodyDatabase(rig.file),
    append = db.append.bind(db);
  try {
    let writes = 0;
    const failure = vi.spyOn(db, "append").mockImplementation(row => {
      if (++writes === 2) throw new Error("segunda fila");
      append(row);
    });
    expect(() => db.appendBatch([fact("one"), fact("two")])).toThrow("segunda fila");
    expect(db.facts()).toEqual([]);
    failure.mockRestore();
    db.appendBatch([fact("three")]);
    expect(db.facts().map(row => row.id)).toEqual(["three"]);
  } finally {
    db.close();
  }
});
it("un reemplazo directo dentro de un lote rechazado no purga la versión que vuelve a quedar vigente", async () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope);
  const first = { key: session.capture(Buffer.from("uno")) },
    next = { key: session.capture(Buffer.from("dos")) };
  session.replace("signing", first, 0);
  expect(() =>
    store.deferCleanup(() => {
      session.replace("signing", next, 1);
      throw new Error("rollback");
    }),
  ).toThrow("rollback");
  expect(session.current("signing")?.refs).toEqual(first);
  await expect(
    store.adapter(session, ["signing"]).use(first, values => Buffer.from(values.key ?? []).toString()),
  ).resolves.toBe("uno");
});
