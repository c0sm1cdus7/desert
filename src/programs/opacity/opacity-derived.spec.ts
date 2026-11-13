import "../../../tests/support/fixture-vault.ts";
import { Type } from "@sinclair/typebox";
import { expect, it, vi } from "vitest";
import { opacityProgram } from "../../../tests/support/opacity-program.ts";
import { shopShown } from "../../../tests/support/shop.ts";
import { programChecks } from "../program-checks.ts";
import { opacityChecks } from "./opacity-derived.ts";
import { ActionSecrets } from "../../adapters/secrets/positions/action-scope.ts";
const checks = (program = opacityProgram()) =>
  programChecks(program, shopShown).filter(check => check.name.endsWith("posiciones secretas opacas"));
it("deriva ambas acciones y todos los casos, por la frontera real", async () => {
  const seen: unknown[] = [];
  const all = checks(opacityProgram(undefined, undefined, seen));
  expect(all).toHaveLength(2);
  for (const check of all) await check.run();
  expect(seen).toHaveLength(20);
});
for (const input of [
  Type.Object({ first: Type.Optional(Type.String({ secret: true })) }),
  Type.Object({ first: Type.Array(Type.String({ secret: true })) }),
  Type.Union([
    Type.Object({ kind: Type.Literal("public") }),
    Type.Object({ kind: Type.Literal("private"), first: Type.String({ secret: true }) }),
  ]),
])
  it("una posición opcional, de lista o rama sin caso ejecutado falla", async () => {
    const program = opacityProgram(input, [
      { promise: "falta", input: { kind: "public", first: [] }, then: { facts: [], says: "Material · Guardado" } },
    ]);
    for (const check of opacityChecks(program))
      await expect(check.run()).rejects.toThrow("Posiciones secretas sin caso ejecutado");
  });
it("centinela: retirar la sustitución hace fallar la compuerta derivada", async () => {
  const mutation = vi
    .spyOn(ActionSecrets.prototype, "scope")
    .mockImplementation((_schema, input, work) => work(input, true));
  try {
    await expect(checks()[0]?.run()).rejects.toThrow("Posiciones secretas sin caso ejecutado");
  } finally {
    mutation.mockRestore();
  }
});
