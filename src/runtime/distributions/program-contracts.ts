// Adapta las mitades declaradas en programas instalables para comprobarlas con sus artefactos y evidencia.
import type { InstallableProgram } from "../../tools/installable/program.ts";
import { codeProjectionVersion } from "../calculation-version.ts";
import type { ContractPackage } from "../contracts/package-contracts.ts";
import type { ContractBuild, ContractEvidence, EvidenceVerifier } from "../contracts/contract-evidence.ts";
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
