// Corre casos del artefacto consumidor en casas aisladas del proveedor y emite evidencia por huellas.
import type { Execution } from "../../tools/execute.ts";
import { startTools } from "../../tools/start.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { caseDeclarationErrors } from "./case-declaration.ts";
import { executeContractCase } from "./case-execution.ts";
import type { ContractBuild, ContractEvidence } from "./contract-evidence.ts";
import { contractHash, evidenceIdentity, evidenceLedger } from "./contract-evidence.ts";
import type { ContractHistory } from "./contract-history.ts";
import { ContractCompositionError, createContractRuntime } from "./contract-runtime.ts";
import { structuralContractErrors } from "./package-checks.ts";
import type { ContractPackage } from "./package-contracts.ts";
export type ContractCaseHouse<X extends Program> = Readonly<{
  ports: Omit<Execution<X>, "live" | "own" | "process"> & Partial<Pick<Execution<X>, "own" | "process">>;
  history: ContractHistory<X>;
  engine?: Pick<ReturnType<typeof startTools<X>>, "act">;
  close: () => void;
}>;
type GateOptions<X extends Program> = Readonly<{
  programs: readonly ContractPackage[];
  provider: string;
  consumer: string;
  contract: string;
  build: ContractBuild;
  prepare: (preparation: unknown) => ContractCaseHouse<X> | Promise<ContractCaseHouse<X>>;
}>;
async function runCase<X extends Program>(
  options: GateOptions<X>,
  scenario: Parameters<typeof executeContractCase>[0],
) {
  const house = await options.prepare(scenario.prepare);
  let stop = () => {};
  try {
    const runtime = createContractRuntime(options.programs, house.ports, house.history);
    const start = () => {
      const engine = startTools({
        ...house.ports,
        history: house.history.events(house.ports.state().through),
        contracts: runtime.context,
      });
      stop = engine.stop;
      return engine;
    };
    const engine = house.engine ?? start();
    // Preparation grants are supplied by the isolated house; attendance still goes through the core.
    for (const tool of house.ports.registry)
      engine.act({ act: "attend", input: { target: tool.id } }, house.ports.state().through, scenario.actor);
    const access = () =>
      runtime.open(options.consumer, {
        tool: "",
        by: scenario.actor,
        execute: async act => {
          const result = engine.act(act, house.ports.state().through, scenario.actor);
          const done = result.status === "processing" ? await result.completion : result;
          return { ...done, ...(done.defect ? { coreFailure: "defect" as const } : {}) };
        },
      });
    return await executeContractCase(scenario, options.contract, access);
  } finally {
    stop();
    house.close();
  }
}
export async function runContractCases<X extends Program>(options: GateOptions<X>) {
  const provider = options.programs.find(program => program.id === options.provider);
  const consumer = options.programs.find(program => program.id === options.consumer);
  const request = consumer?.pide[options.contract];
  const errors = structuralContractErrors(options.programs);
  if (!provider?.ofrece[options.contract] || !consumer || !request) throw new ContractCompositionError(errors);
  errors.push(...caseDeclarationErrors(request, `${consumer.id}/${options.contract}`));
  if (errors.length) throw new ContractCompositionError(errors);
  const ledger = evidenceLedger();
  const evidence: ContractEvidence[] = [];
  for (const scenario of request.casos) {
    const identity = evidenceIdentity(provider, consumer, options.contract, scenario, options.build);
    try {
      const run = await runCase(options, scenario);
      evidence.push(
        ledger.record({
          ...identity,
          result: run.passed ? "passed" : "failed",
          observations: contractHash(run.observations),
        }),
      );
    } catch {
      evidence.push(ledger.record({ ...identity, result: "environment", observations: contractHash([]) }));
    }
  }
  return { evidence, verify: ledger.matches };
}
