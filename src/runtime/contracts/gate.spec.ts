import { required } from "../../../tests/support/distribution-contracts.ts";
import { describe, expect, it } from "vitest";
import { contractHouse, documents, sales } from "../../../tests/support/distribution-contracts.ts";
import { runContractCases } from "./contract-gate.ts";
import { validateContractPrograms } from "./validate-contracts.ts";
const build = { core: "core-commit", executor: "executor-commit" };
const options = () => ({
  programs: [sales(), documents()],
  provider: "documentos",
  consumer: "ventas",
  contract: "documentos-fiscales",
  build,
  prepare: () => contractHouse(),
});
describe("consumer cases at the provider gate", () => {
  it("executes real calls, notices, reads and idempotence and fingerprints the evidence", async () => {
    const setup = options();
    const before = validateContractPrograms(setup.programs, build);
    expect(before.errors).toEqual(["ventas/documentos-fiscales/casos/emitir-y-leer:caso-no-declarado"]);
    expect(before.rows[0]?.status).toBe("casos no comprobados");
    const run = await runContractCases(setup);
    expect(run.evidence.map(row => row.result)).toEqual(["passed"]);
    expect(run.evidence[0]?.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(validateContractPrograms(setup.programs, build, run.evidence, run.verify)).toEqual({
      errors: [],
      rows: [
        { consumer: "ventas", provider: "documentos", contract: "documentos-fiscales", status: "casos comprobados" },
      ],
    });
    const repeat = await runContractCases(setup);
    expect(repeat.evidence[0]?.offer).toBe(run.evidence[0]?.offer);
    expect(repeat.evidence[0]?.caseHash).toBe(run.evidence[0]?.caseHash);
  });
  it("never accepts copied evidence, another offer, artifact, case or executor", async () => {
    const setup = options();
    const run = await runContractCases(setup);
    const missing = ["ventas/documentos-fiscales/casos/emitir-y-leer:caso-no-declarado"];
    expect(
      validateContractPrograms(
        setup.programs,
        build,
        run.evidence.map(row => ({ ...row })),
        run.verify,
      ).errors,
    ).toEqual(missing);
    expect(
      validateContractPrograms(setup.programs, { ...build, executor: "other" }, run.evidence, run.verify).errors,
    ).toEqual(missing);
    for (const provider of [
      { ...documents(), artifact: "other" },
      { ...documents(), version: "4.0.0" },
    ])
      expect(validateContractPrograms([sales(), provider], build, run.evidence, run.verify).errors).toEqual(missing);
    const consumer = sales(),
      request = required(consumer.pide["documentos-fiscales"]);
    const changed = {
      ...consumer,
      pide: { "documentos-fiscales": { ...request, casos: request.casos.map(c => ({ ...c, actor: "ana" })) } },
    };
    expect(validateContractPrograms([changed, documents()], build, run.evidence, run.verify).errors).toEqual(missing);
  });
  it("records behavioral failures and environment failures without certifying either", async () => {
    const setup = options();
    const failed = await runContractCases({
      ...setup,
      prepare: () => contractHouse(() => ({ status: "inconclusive" })),
    });
    expect(failed.evidence[0]?.result).toBe("failed");
    expect(validateContractPrograms(setup.programs, build, failed.evidence, failed.verify).errors).toHaveLength(1);
    const environment = await runContractCases({
      ...setup,
      prepare: () => {
        throw new Error("fixture unavailable");
      },
    });
    expect(environment.evidence[0]?.result).toBe("environment");
  });
  it("rejects a case outside its request before preparing a house", async () => {
    const setup = options(),
      consumer = sales(),
      request = required(consumer.pide["documentos-fiscales"]);
    const changed = {
      ...consumer,
      pide: {
        "documentos-fiscales": {
          ...request,
          casos: request.casos.map(c => ({
            ...c,
            steps: [{ kind: "action" as const, name: "borrar", input: {}, expect: {} }],
          })),
        },
      },
    };
    let preparations = 0;
    await expect(
      runContractCases({
        ...setup,
        programs: [changed, documents()],
        prepare: () => {
          preparations++;
          return contractHouse();
        },
      }),
    ).rejects.toMatchObject({ errors: ["ventas/documentos-fiscales/casos/emitir-y-leer/0:fuera-del-pedido"] });
    expect(preparations).toBe(0);
  });
});
