import { expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { CustodyDatabase } from "./custody-database.ts";
import { CustodyError } from "./house-keys.ts";

it("distingue un registro corto de otra cabeza y explica lo que se acepta", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  session.replace("firma", { key: session.capture(Buffer.from("invented")) }, 0);
  store.close();
  const db = new DatabaseSync(rig.file);
  db.exec("drop trigger custody_no_delete; delete from custody_facts");
  db.close();
  expect(() => rig.open()).toThrow(/ancla espera 1 renglones; hay 0.*vínculos/su);
});
it("informa almacenamiento al llenarse SQLite", () => {
  const rig = custodyRig(),
    db = new CustodyDatabase(rig.file);
  const pages = db.db.prepare("pragma page_count").get()?.page_count;
  db.db.exec(`pragma max_page_count=${Number(pages)}`);
  expect(() => db.intent("secret:00000000-0000-4000-8000-000000000000", "x".repeat(100000), false)).toThrow(
    /E-CUSTODY-STORAGE.*espacio en disco/u,
  );
  db.close();
});
it("explica los cuatro códigos de custodia", () => {
  for (const code of ["E-CUSTODY-INTEGRITY", "E-CUSTODY-MISSING", "E-CUSTODY-LOCKED", "E-CUSTODY-STORAGE"] as const)
    expect(new CustodyError(code).message.length).toBeGreaterThan(code.length);
});

it("ingresar y usar no convierten el material a texto", async () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const marker = Buffer.from([37, 41, 43, 47, 53, 59, 61, 67, 71]);
  const proto: unknown = Object.getPrototypeOf(Buffer.alloc(0));
  if (!proto || typeof proto !== "object" || !("toString" in proto)) throw new Error("fixture");
  const descriptor = Object.getOwnPropertyDescriptor(proto, "toString");
  const original: unknown = descriptor?.value;
  if (!descriptor || typeof original !== "function") throw new Error("fixture");
  let conversions = 0;
  Object.defineProperty(proto, "toString", {
    ...descriptor,
    value: function (this: Buffer, ...args: unknown[]) {
      if (this.equals(marker)) conversions++;
      return String(Reflect.apply(original, this, args));
    },
  });
  const originalString = globalThis.String;
  const stringSpy = vi.spyOn(globalThis, "String").mockImplementation(value => {
    if (value instanceof Uint8Array && Buffer.from(value).equals(marker)) conversions++;
    return originalString(value);
  });
  try {
    const ref = session.capture(Buffer.from(marker));
    session.replace("firma", { key: ref }, 0);
    await store.adapter(session, ["firma"]).use({ key: ref }, material => material.key?.length);
    expect(conversions).toBe(0);
  } finally {
    stringSpy.mockRestore();
    Object.defineProperty(proto, "toString", descriptor);
    store.close();
  }
});
