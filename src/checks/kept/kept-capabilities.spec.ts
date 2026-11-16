import { expect, it } from "vitest";
import { inspectionCapabilities } from "./kept-capabilities.ts";
import type { CredentialFact } from "../../keychain/custody/custody-contract.ts";
import { effect } from "../../house/facts.ts";
const scope = { actor: "ana", tool: "vault", target: "vault" };
const bound: CredentialFact = {
  ...scope,
  id: "bound",
  kind: "credential-bound",
  slot: "signing",
  revision: 1,
  refs: { key: "secret:00000000-0000-4000-8000-000000000001" },
  cause: "synthetic",
};
const lease = (facts: readonly CredentialFact[]) =>
  inspectionCapabilities({ credentialSlots: { vault: ["signing", "backup"] } }, facts)(scope);
it("X02: apply no consume ni se atribuye los hechos del programa", () => {
  const capabilities = lease([bound]);
  for (const accepted of [false, true]) expect(capabilities.apply(effect("boot", {}, "ana"), accepted)).toBe(false);
});
for (const other of [{ actor: "beto" }, { tool: "other" }, { target: "child" }, { slot: "backup" }])
  it(`X03: current y revision leen solo su alcance y casillero ${JSON.stringify(other)}`, () => {
    const capabilities = lease([bound, { ...bound, ...other, revision: 5 }]);
    expect(capabilities.credentials.current("signing")).toEqual({ revision: 1, refs: bound.refs });
    expect(capabilities.credentials.revision("signing")).toBe(1);
  });
it("X04: limpieza y purga posteriores no reemplazan el último vínculo", () => {
  const capabilities = lease([
    bound,
    { ...bound, kind: "credential-cleanup-pending", revision: 2, refs: {} },
    { ...bound, kind: "credential-purged", revision: 3, refs: {} },
  ]);
  expect(capabilities.credentials.current("signing")).toEqual({ revision: 1, refs: bound.refs });
  expect(capabilities.credentials.revision("signing")).toBe(1);
});
for (const kind of ["credential-released", "credential-unusable"] as const)
  it(`X05: ${kind} no devuelve referencias y conserva la revisión`, () => {
    const capabilities = lease([bound, { ...bound, kind, revision: 2, refs: {} }]);
    expect(capabilities.credentials.current("signing")).toBeUndefined();
    expect(capabilities.credentials.revision("signing")).toBe(2);
  });
it("C1: captura, reemplazo y liberación tienen una marca propia y un motivo", () => {
  const capabilities = lease([bound]);
  for (const [reason, operation] of [
    ["capturar credencial", () => capabilities.capture("sintético")],
    ["reemplazar credencial", () => capabilities.credentials.replace("signing", {}, 1)],
    ["liberar credencial", () => capabilities.credentials.release("signing", 1)],
  ] as const) {
    expect(operation).toThrow(
      expect.objectContaining({
        name: "InspectionUnavailable",
        code: "E-CUSTODY-DENIED",
        reason,
      }),
    );
  }
});
