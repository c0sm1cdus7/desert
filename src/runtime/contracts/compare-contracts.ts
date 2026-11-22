// Compares what a program requests with what a provider publishes.
import type { ContractInterface } from "../../tools/contracts/contract-types.ts";
import { schemaInclusion } from "./schema-inclusion.ts";

export function compareContracts(request: ContractInterface, offer: ContractInterface, path: string): string[] {
  const errors: string[] = [];
  for (const [name, need] of Object.entries(request.acciones)) {
    const have = Object.hasOwn(offer.acciones, name) ? offer.acciones[name] : undefined,
      base = `${path}/acciones/${name}`;
    if (!have) {
      errors.push(`${base}:ausente`);
      continue;
    }
    errors.push(...schemaInclusion(need.entrada, have.entrada, `${base}/entrada`, "entrada"));
    errors.push(...schemaInclusion(have.salida, need.salida, `${base}/salida`, "lectura"));
    errors.push(...schemaInclusion(have.rechazos, need.rechazos, `${base}/rechazos`, "lectura"));
  }
  for (const [name, need] of Object.entries(request.objetos)) {
    const have = Object.hasOwn(offer.objetos, name) ? offer.objetos[name] : undefined,
      base = `${path}/objetos/${name}`;
    if (!have) {
      errors.push(`${base}:ausente`);
      continue;
    }
    errors.push(...schemaInclusion(need.clave, have.clave, `${base}/clave`, "entrada"));
    errors.push(...schemaInclusion(have.datos, need.datos, `${base}/datos`, "lectura"));
  }
  for (const [name, need] of Object.entries(request.avisos)) {
    const have = Object.hasOwn(offer.avisos, name) ? offer.avisos[name] : undefined,
      base = `${path}/avisos/${name}`;
    if (!have) {
      errors.push(`${base}:ausente`);
      continue;
    }
    errors.push(...schemaInclusion(have.datos, need.datos, `${base}/datos`, "lectura"));
  }
  return errors;
}
