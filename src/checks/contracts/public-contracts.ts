// Certifies the contracts of independently declared programs for a distribution, through the provider gate.
import { fileURLToPath } from "node:url";
import { vocabulary } from "../../journal/vocabulary.ts";
import { codeProjectionVersion } from "../../runtime/calculation-version.ts";
import type { ContractEvidence, EvidenceVerifier } from "../../runtime/contracts/contract-evidence.ts";
import { runContractCases } from "../../runtime/contracts/contract-gate.ts";
import type { DistributionOptions } from "../../runtime/distributions/compose.ts";
import {
  bindProgramContracts,
  programContracts,
  type ContractCertification,
} from "../../runtime/distributions/program-contracts.ts";
import type { Composition } from "../../tools/promises-contract.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { prepareContractHouse } from "./contract-case-house.ts";
export type { ContractCertification } from "../../runtime/distributions/program-contracts.ts";
export type {
  ContractCase,
  ContractCaseStep,
  ContractOffer,
  ContractPackage,
  ContractProjector,
  ContractRequest,
} from "../../tools/contracts/package-contracts.ts";
export type {
  ContractAction,
  ContractInterface,
  ContractNotice,
  ContractObject,
} from "../../tools/contracts/contract-types.ts";
/** The composition a distribution is about to make, before it has evidence: the same programs, installed. */
function candidate(options: Omit<DistributionOptions, "contratos">): Composition<Program> {
  const installed = options.programas.map(program => ({ id: program.id, ...program.install() }));
  const roots = [
    fileURLToPath(new URL("../../", import.meta.url)),
    ...options.presentacion.codigo,
    ...options.programas.flatMap(program => program.codigo),
  ];
  const registry = installed.map(program => program.tool);
  return {
    contractSetup: bindProgramContracts(options.programas, registry),
    identities: options.identidades,
    projectionVersion: codeProjectionVersion(roots),
    registry,
    slices: {
      initial: Object.fromEntries(installed.map(program => [program.id, program.initial])),
      step: Object.fromEntries(installed.map(program => [program.id, program.step])),
    },
    words: vocabulary(Object.fromEntries(options.programas.flatMap(p => p.hechos.map(f => [f.nombre, f.forma])))),
  };
}
/** Runs every case each program requests against its single provider, each in its own isolated house, and returns
 * the evidence `componer` takes as `contratos`. A request without exactly one provider is left to `componer`, which
 * says why. Only the rows this call issued are credited: a copied row is not. */
export async function certifyContracts(
  options: Omit<DistributionOptions, "contratos">,
): Promise<ContractCertification> {
  const program = candidate(options);
  const version =
    typeof program.projectionVersion === "string" ? program.projectionVersion : program.projectionVersion.value;
  const build = { core: version, executor: version };
  const packages = programContracts(options.programas);
  const evidence: ContractEvidence[] = [];
  const verifiers: EvidenceVerifier[] = [];
  for (const consumer of packages)
    for (const [contract, request] of Object.entries(consumer.pide)) {
      const providers = packages.filter(provider => Object.hasOwn(provider.ofrece, contract));
      const provider = providers.length === 1 ? providers[0] : undefined;
      if (!provider) continue;
      for (const scenario of request.casos) {
        const selected = packages.map(item =>
          item.id === consumer.id
            ? { ...item, pide: { ...item.pide, [contract]: { ...request, casos: [scenario] } } }
            : item,
        );
        const run = await runContractCases({
          programs: selected,
          provider: provider.id,
          consumer: consumer.id,
          contract,
          build,
          prepare: preparation => prepareContractHouse(program, scenario.actor, preparation),
        });
        evidence.push(...run.evidence);
        verifiers.push(run.verify);
      }
    }
  return { build, evidence, verify: (row, identity) => verifiers.some(verify => verify(row, identity)) };
}
