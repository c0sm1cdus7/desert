// Adapts the halves installable programs declare, to check them with their artifacts and evidence.
import type { InstallableProgram } from "../../tools/installable/program.ts";
import type { ContractSetup, Program, ToolRegistry } from "../../tools/tool-contract.ts";
import { codeProjectionVersion } from "../calculation-version.ts";
import type { ContractBuild, ContractEvidence, EvidenceVerifier } from "../contracts/contract-evidence.ts";
import { contractHistory } from "../contracts/contract-history.ts";
import { copyContractPackages } from "../contracts/contract-record.ts";
import { checkContractBindings, createContractRuntime } from "../contracts/contract-runtime.ts";
import type { ContractPackage } from "../../tools/contracts/package-contracts.ts";
import { validateContractPrograms } from "../contracts/validate-contracts.ts";
import { stateReadings } from "../contracts/state-readings.ts";
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

/** Installs every program with what it reads from its providers, by the same packages its contracts bind. */
export function installPrograms<P extends ContractualProgram>(programs: readonly P[]) {
  const packages = copyContractPackages(programContracts(programs));
  const registry: ToolRegistry<Program>[number][] = [];
  const installed = programs.map(definition => ({
    definition,
    ...definition.install(stateReadings(packages, definition.id, () => registry)),
  }));
  registry.push(...installed.map(program => program.tool));
  return { packages, installed };
}
/** Bind before returning a composition; each opening receives its own journal and cuts. */
const boundPackages = new WeakMap<object, readonly ContractPackage[]>();
export const packagesForContracts = (setup: object) => boundPackages.get(setup);
export function bindProgramContracts(
  packages: readonly ContractPackage[],
  registry: ToolRegistry<Program>,
): ContractSetup<Program> {
  checkContractBindings(packages, { registry });
  const setup: ContractSetup<Program> = source =>
    createContractRuntime(packages, source, contractHistory(source.initial, source.slices, source.events)).context;
  boundPackages.set(setup, packages);
  return setup;
}
