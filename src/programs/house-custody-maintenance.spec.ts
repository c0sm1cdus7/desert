import { expect, it, vi } from "vitest";
import { cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Type } from "@sinclair/typebox";
import { adapterHouse } from "../../tests/support/adapter-house.ts";
import { imported } from "../../tests/support/declared-adapters.ts";
import { toolAct } from "../tools/act-definition.ts";
import { CustodyDatabase } from "../adapters/secrets/custody/custody-database.ts";
import * as runtime from "./house-runtime.ts";
const empty = Type.Object({});
const acts: import("../tools/tool-contract.ts").Tool<import("../../tests/support/shop.ts").Shop>["acts"] = {
  rotate: toolAct(empty, async (_, ctx) => ({
    status: "accepted",
    effects: [ctx.credentials.replace("signing", await imported(ctx), ctx.credentials.revision("signing"))],
  })),
  release: toolAct(empty, (_, ctx) => ({
    status: "accepted",
    text: "desconectado",
    effects: [ctx.credentials.release("signing", ctx.credentials.revision("signing"))],
  })),
  current: toolAct(empty, (_, ctx) => ({
    status: ctx.credentials.current("signing") ? "accepted" : "rejected",
    reason: "Sin firma",
  })),
};
it("la acción conserva la liberación y devuelve el borrado pendiente", async () => {
  const rig = adapterHouse(acts);
  expect((await rig.act("rotate")).status).toBe("accepted");
  const fail = vi.spyOn(CustodyDatabase.prototype, "remove").mockImplementation(() => {
    throw new Error("disco");
  });
  try {
    const result = await rig.act("release");
    expect(result.status).toBe("accepted");
    expect(result).toMatchObject({ cleanupPending: true });
    expect(JSON.stringify(result.effects)).toContain("desconectado");
  } finally {
    fail.mockRestore();
  }
});
it("la composición revisa y acepta la cabeza exacta con la casa cerrada y vuelve a abrir el registro", async () => {
  const rig = adapterHouse(acts);
  expect((await rig.act("rotate")).status).toBe("accepted");
  rig.close();
  const backup = `${rig.path}-backup`;
  try {
    cpSync(rig.path, backup, { recursive: true });
    rig.restart();
    expect((await rig.act("rotate")).status).toBe("accepted");
    rig.close();
    rmSync(rig.path, { recursive: true });
    cpSync(backup, rig.path, { recursive: true });
    expect(() => rig.restart()).toThrow("E-CUSTODY-ROLLBACK");
    const review = runtime.maintainHouseCustody(rig.path, rig.options, { operation: "review" });
    expect(review.unusable.map(fact => fact.slot)).toContain("signing");
    for (const head of [
      { ...review.head, count: review.head.count + 1 },
      { ...review.head, authentication: "0".repeat(64) },
    ])
      expect(() => runtime.maintainHouseCustody(rig.path, rig.options, { operation: "accept", head })).toThrow(
        "E-CUSTODY-CONFLICT",
      );
    const accepted = runtime.maintainHouseCustody(rig.path, rig.options, { operation: "accept", head: review.head });
    expect(accepted.unusable.map(fact => fact.slot)).toContain("signing");
    rig.restart();
    expect(rig.facts().length).toBeGreaterThan(0);
    expect((await rig.act("current")).status).toBe("rejected");
    expect((await rig.act("rotate")).status).toBe("accepted");
    expect(() => runtime.maintainHouseCustody(rig.path, rig.options, { operation: "review" })).toThrow();
    rig.close();
    expect(runtime.maintainHouseCustody(rig.path, rig.options, { operation: "status" }).unusable).toEqual([]);
  } finally {
    rmSync(backup, { recursive: true, force: true });
  }
});
it("mantenimiento ve y reintenta pendientes, adopta y descarta legado, y olvida sin abrir herramientas", async () => {
  const rig = adapterHouse(acts);
  await rig.act("rotate");
  rig.close();
  const db = new CustodyDatabase(join(rig.path, "fixture.sqlite"));
  expect(db.rows()).toHaveLength(1);
  db.close();
  const review = runtime.maintainHouseCustody(rig.path, rig.options, { operation: "status" });
  expect(review.cleanupPending).toBe(false);
  expect(() =>
    runtime.maintainHouseCustody(rig.path, rig.options, { operation: "forget", acknowledgement: "" }),
  ).toThrow("E-CUSTODY-DENIED");
  runtime.maintainHouseCustody(rig.path, rig.options, { operation: "forget", acknowledgement: review.forgetWarning });
  expect(() => rig.restart()).toThrow("E-CUSTODY-KEY");
});
it("ve el pendiente sin reintentarlo y lo reintenta cuando la composición lo pide", async () => {
  const start = vi.fn(() => () => {}),
    rig = adapterHouse(acts, { start });
  await rig.act("rotate");
  const fail = vi.spyOn(CustodyDatabase.prototype, "remove").mockImplementation(() => {
    throw new Error("disco");
  });
  try {
    expect(await rig.act("release")).toMatchObject({ status: "accepted", cleanupPending: true });
    rig.close();
    start.mockClear();
    fail.mockClear();
    const report = runtime.maintainHouseCustody(rig.path, rig.options, { operation: "status" });
    expect(report.cleanupPending).toBe(true);
    expect(report.pending).toHaveLength(1);
    expect(fail).not.toHaveBeenCalled();
    expect(runtime.maintainHouseCustody(rig.path, rig.options, { operation: "retry" }).cleanupPending).toBe(true);
    expect(fail).toHaveBeenCalled();
    fail.mockRestore();
    expect(runtime.maintainHouseCustody(rig.path, rig.options, { operation: "retry" }).cleanupPending).toBe(false);
    expect(start).not.toHaveBeenCalled();
  } finally {
    fail.mockRestore();
  }
});
it("adopta y descarta material retenido con el registro del motor conectado", async () => {
  const rig = adapterHouse(acts);
  rig.close();
  const { SecretCustody } = await import("../adapters/secrets/custody/secret-custody.ts");
  const custody = new SecretCustody(join(rig.path, "fixture.sqlite"), rig.path, rig.options.secretKeys);
  const kept = custody.keep(Buffer.from("legado")),
    discarded = custody.keep(Buffer.from("descartable"));
  custody.close();
  const review = runtime.maintainHouseCustody(rig.path, rig.options, { operation: "status" });
  expect(review.retained).toEqual([kept, discarded]);
  const adopted = runtime.maintainHouseCustody(rig.path, rig.options, {
    operation: "adopt",
    scope: { actor: "ana", tool: "vault", target: "vault" },
    slot: "signing",
    refs: { key: kept },
    expected: 0,
  });
  expect(adopted.bindings).toContainEqual(expect.objectContaining({ slot: "signing", refs: { key: kept } }));
  expect(adopted.retained).toEqual([discarded]);
  const report = runtime.maintainHouseCustody(rig.path, rig.options, { operation: "discard", ref: discarded });
  expect(report.retained).toEqual([]);
  expect(report.cleanupPending).toBe(false);
  rig.restart();
  expect((await rig.act("current")).status).toBe("accepted");
  expect(JSON.stringify(rig.facts())).toContain("credential-purged");
});
it("la acción que delega una liberación también recibe el pendiente en el resultado anidado", async () => {
  let nested: unknown;
  const rig = adapterHouse({
    ...acts,
    nested: toolAct(empty, async (_, context) => {
      const result = await context.execute?.({ act: "release", target: "vault", input: {} });
      nested = result;
      return result ?? { status: "accepted" };
    }),
  });
  await rig.act("rotate");
  const fail = vi.spyOn(CustodyDatabase.prototype, "remove").mockImplementation(() => {
    throw new Error("disco");
  });
  try {
    expect(await rig.act("nested")).toMatchObject({ status: "accepted", cleanupPending: true });
    expect(nested).toMatchObject({ status: "accepted", cleanupPending: true });
  } finally {
    fail.mockRestore();
  }
});
it("el mantenimiento muestra lo pendiente aunque falló antes de escribir su marca", async () => {
  const rig = adapterHouse(acts);
  await rig.act("rotate");
  const { AuthenticatedLedger } = await import("../adapters/secrets/custody/authenticated-ledger.ts");
  let spy = vi.spyOn(AuthenticatedLedger.prototype, "append");
  function append(this: InstanceType<typeof AuthenticatedLedger>, fact: Parameters<typeof this.append>[0]): void {
    if (fact.kind === "credential-cleanup-pending") throw new Error("disco");
    spy.mockRestore();
    this.append(fact);
    spy = vi.spyOn(AuthenticatedLedger.prototype, "append").mockImplementation(append);
  }
  spy.mockImplementation(append);
  try {
    expect(await rig.act("release")).toMatchObject({ status: "accepted", cleanupPending: true });
  } finally {
    spy.mockRestore();
  }
  rig.close();
  const report = runtime.maintainHouseCustody(rig.path, rig.options, { operation: "status" });
  expect(report.cleanupPending).toBe(true);
  expect(report).toMatchObject({ pendingRefs: [expect.stringMatching(/^secret:/u)] });
  expect(runtime.maintainHouseCustody(rig.path, rig.options, { operation: "retry" }).cleanupPending).toBe(false);
});
