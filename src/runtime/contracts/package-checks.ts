// Comprueba rutas propias y mitades completas antes de prestar puertos entre programas.
import { diagnoseContracts } from "./contract-graph.ts";
import { schemaInclusion } from "./schema-inclusion.ts";
import type { ContractInterface } from "./contract-types.ts";
import type { ContractPackage } from "./package-contracts.ts";
const supportedReading = (value: unknown): boolean => value === "casa";
function shapes(half: ContractInterface, base: string): string[] {
  const errors: string[] = [];
  for (const [name, action] of Object.entries(half.acciones))
    for (const [key, schema] of Object.entries(action).filter(([key]) => key !== "ruta"))
      if (typeof schema === "object")
        errors.push(
          ...schemaInclusion(
            schema,
            schema,
            `${base}/acciones/${name}/${key}`,
            key === "entrada" ? "entrada" : "lectura",
          ),
        );
  for (const [name, object] of Object.entries(half.objetos)) {
    if (!supportedReading(object.lectura)) errors.push(`${base}/objetos/${name}:lectura-no-soportada`);
    errors.push(...schemaInclusion(object.clave, object.clave, `${base}/objetos/${name}/clave`, "entrada"));
    errors.push(...schemaInclusion(object.datos, object.datos, `${base}/objetos/${name}/datos`, "lectura"));
  }
  for (const [name, notice] of Object.entries(half.avisos)) {
    if (!supportedReading(notice.lectura)) errors.push(`${base}/avisos/${name}:lectura-no-soportada`);
    errors.push(...schemaInclusion(notice.datos, notice.datos, `${base}/avisos/${name}/datos`, "lectura"));
  }
  return errors;
}
function ownOffers(program: ContractPackage): string[] {
  const errors: string[] = [];
  const routes = Object.entries(program.herramientas).flatMap(([tool, actions]) => actions.map(a => `${tool}/${a}`));
  for (const [name, offer] of Object.entries(program.ofrece)) {
    const base = `${program.id}/${name}`;
    for (const [action, value] of Object.entries(offer.acciones))
      if (!routes.includes(value.ruta)) errors.push(`${base}/acciones/${action}:ruta-ajena:${value.ruta}`);
    for (const [object, value] of Object.entries(offer.objetos))
      if (!Object.hasOwn(program.proyectores, value.proyector))
        errors.push(`${base}/objetos/${object}:proyector-ausente:${value.proyector}`);
    for (const [notice, value] of Object.entries(offer.avisos))
      if (!program.hechos.includes(value.hecho)) errors.push(`${base}/avisos/${notice}:hecho-no-propio:${value.hecho}`);
  }
  return errors;
}
export function structuralContractErrors(programs: readonly ContractPackage[]): string[] {
  const errors = diagnoseContracts(programs);
  const ids = new Set<string>(),
    facts = new Set<string>();
  for (const program of programs) {
    if (program.desert !== 1) errors.push(`contrato-desert:${program.id}`);
    if (ids.has(program.id)) errors.push(`id-repetido:${program.id}`);
    ids.add(program.id);
    for (const fact of program.hechos) {
      if (facts.has(fact)) errors.push(`hecho-repetido:${fact}`);
      if (!fact.startsWith(`${program.id}/`)) errors.push(`hecho-ajeno:${fact}`);
      facts.add(fact);
    }
    errors.push(...ownOffers(program));
    const halves: readonly Readonly<Record<string, ContractInterface>>[] = [program.ofrece, program.pide];
    for (const half of halves)
      for (const [name, contract] of Object.entries(half)) errors.push(...shapes(contract, `${program.id}/${name}`));
  }
  return [...new Set(errors)];
}
