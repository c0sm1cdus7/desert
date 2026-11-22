// Adapta las mitades declaradas en programas instalables para comprobarlas con sus artefactos y evidencia.
import type { InstallableProgram } from "../../tools/installable/program.ts";
import type { ContractSetup, Program, ToolRegistry } from "../../tools/tool-contract.ts";
import { codeProjectionVersion } from "../calculation-version.ts";
import type { ContractBuild, ContractEvidence, EvidenceVerifier } from "../contracts/contract-evidence.ts";
import { contractHistory } from "../contracts/contract-history.ts";
import { copyContractPackages } from "../contracts/contract-record.ts";
import { checkContractBindings, createContractRuntime } from "../contracts/contract-runtime.ts";
import type { ContractPackage } from "../../tools/contracts/package-contracts.ts";
import { validateContractPrograms } from "../contracts/validate-contracts.ts";
export type ContractualProgram = InstallableProgram &
  Partial<Pick<ContractPackage, "artifact" | "ofrece" | "pide" | "proyectores">>;
export type ContractCertification = Readonly<{
  build: ContractBuild;
  evidence?: readonly ContractEvidence[];
  verify?: EvidenceVerifier;
}>;
export function programContracts(programs: readonly ContractualProgram[]): readonly ContractPackage[] {
  return programs.map(program => ({
    id: program.id,
    version: program.version,
    desert: program.desert,
    artifact: program.artifact ?? codeProjectionVersion(program.codigo).value,
    herramientas: Object.fromEntries(
      Object.entries(program.herramientas).map(([name, group]) => [name, Object.keys(group.acts)]),
    ),
    hechos: program.hechos.map(fact => fact.nombre),
    proyectores: program.proyectores ?? {},
    ofrece: program.ofrece ?? {},
    pide: program.pide ?? {},
  }));
}
export function distributionContracts(programs: readonly ContractualProgram[], certification?: ContractCertification) {
  if (!programs.some(program => program.ofrece !== undefined || program.pide !== undefined))
    return { errors: [], rows: [] };
  return validateContractPrograms(
    programContracts(programs),
    certification?.build ?? { core: "", executor: "" },
    certification?.evidence,
    certification?.verify,
  );
}

export function distributionContractIssues(
  programs: readonly ContractualProgram[],
  certification?: ContractCertification,
) {
  return distributionContracts(programs, certification).errors.flatMap(error => {
    const [first = "", ...rest] = error.split(":");
    const detail = rest.join(":");
    // El núcleo ya informa estos motivos; no duplicamos sus caminos con el formato contractual.
    if (["contrato-desert", "id-repetido", "hecho-repetido", "hecho-ajeno"].includes(first)) return [];
    return [
      ["sin-proveedor", "dos-o-mas-proveedores", "ciclo"].includes(first)
        ? { path: detail, reason: first }
        : { path: first, reason: detail },
    ];
  });
}

/** Bind before returning a composition; each opening receives its own journal and cuts. */
const boundPackages = new WeakMap<object, readonly ContractPackage[]>();
export const packagesForContracts = (setup: object) => boundPackages.get(setup);
export function bindProgramContracts(
  programs: readonly ContractualProgram[],
  registry: ToolRegistry<Program>,
): ContractSetup<Program> {
  const packages = copyContractPackages(programContracts(programs));
  checkContractBindings(packages, { registry });
  const setup: ContractSetup<Program> = source =>
    createContractRuntime(packages, source, contractHistory(source.initial, source.slices, source.events)).context;
  boundPackages.set(setup, packages);
  return setup;
}
