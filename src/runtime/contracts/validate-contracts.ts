// Gives compose every reason with its path, and rows that tell inclusion apart from executed cases.
import type { ContractPackage } from "../../tools/contracts/package-contracts.ts";
import { structuralContractErrors } from "./package-checks.ts";
import { caseDeclarationErrors } from "./case-declaration.ts";
import { compatibilityLabel, evidenceIdentity } from "./contract-evidence.ts";
import type { ContractBuild, ContractEvidence, EvidenceVerifier } from "./contract-evidence.ts";
export function validateContractPrograms(
  programs: readonly ContractPackage[],
  build: ContractBuild,
  evidence: readonly ContractEvidence[] = [],
  verify: EvidenceVerifier = () => false,
) {
  const errors = structuralContractErrors(programs);
  const rows: { consumer: string; provider: string; contract: string; status: string }[] = [];
  for (const consumer of programs) {
    for (const [name, request] of Object.entries(consumer.pide)) {
      const base = `${consumer.id}/${name}`;
      errors.push(...caseDeclarationErrors(request, base));
      if (!request.casos.length) errors.push(`${base}/casos:casos-no-comprobados`);
      const providers = programs.filter(program => Object.hasOwn(program.ofrece, name));
      const provider = providers.length === 1 ? providers[0] : undefined;
      if (!provider) continue;
      const missing = request.casos.filter(
        scenario => !evidence.some(row => verify(row, evidenceIdentity(provider, consumer, name, scenario, build))),
      );
      for (const scenario of missing) errors.push(`${base}/casos/${scenario.id}:caso-no-declarado`);
      const checked = request.casos.length > 0 && missing.length === 0;
      rows.push({ consumer: consumer.id, provider: provider.id, contract: name, status: compatibilityLabel(checked) });
    }
  }
  return { errors: [...new Set(errors)], rows };
}
