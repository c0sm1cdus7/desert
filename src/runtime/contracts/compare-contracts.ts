// Compara lo que pide un programa con lo publicado por un proveedor.
import type { ContractInterface } from "./contract-types.ts";
import { schemaInclusion } from "./schema-inclusion.ts";

export function compareContracts(request: ContractInterface, offer: ContractInterface, path: string): string[] {
  const errors: string[] = [];
  for (const [name, need] of Object.entries(request.acciones)) {
    const have = offer.acciones[name],
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
    const have = offer.objetos[name],
      base = `${path}/objetos/${name}`;
    if (!have) {
      errors.push(`${base}:ausente`);
      continue;
    }
    errors.push(...schemaInclusion(need.clave, have.clave, `${base}/clave`, "entrada"));
    errors.push(...schemaInclusion(have.datos, need.datos, `${base}/datos`, "lectura"));
  }
  for (const [name, need] of Object.entries(request.avisos)) {
    const have = offer.avisos[name],
      base = `${path}/avisos/${name}`;
    if (!have) {
      errors.push(`${base}:ausente`);
      continue;
    }
    errors.push(...schemaInclusion(have.datos, need.datos, `${base}/datos`, "lectura"));
  }
  return errors;
}
