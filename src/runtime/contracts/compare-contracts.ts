// Compares what a program requests with what a provider publishes.
import type { ContractInterface } from "../../tools/contracts/contract-types.ts";
import { schemaInclusion } from "./schema-inclusion.ts";

export function compareContracts(request: ContractInterface, offer: ContractInterface, path: string): string[] {
  const errors: string[] = [];
  for (const [name, need] of Object.entries(request.actions)) {
    const have = Object.hasOwn(offer.actions, name) ? offer.actions[name] : undefined,
      base = `${path}/actions/${name}`;
    if (!have) {
      errors.push(`${base}:missing`);
      continue;
    }
    errors.push(...schemaInclusion(need.input, have.input, `${base}/input`, "input"));
    errors.push(...schemaInclusion(have.output, need.output, `${base}/output`, "reading"));
    errors.push(...schemaInclusion(have.rejections, need.rejections, `${base}/rejections`, "reading"));
  }
  for (const [name, need] of Object.entries(request.objects)) {
    const have = Object.hasOwn(offer.objects, name) ? offer.objects[name] : undefined,
      base = `${path}/objects/${name}`;
    if (!have) {
      errors.push(`${base}:missing`);
      continue;
    }
    errors.push(...schemaInclusion(need.key, have.key, `${base}/key`, "input"));
    errors.push(...schemaInclusion(have.data, need.data, `${base}/data`, "reading"));
  }
  for (const [name, need] of Object.entries(request.notices)) {
    const have = Object.hasOwn(offer.notices, name) ? offer.notices[name] : undefined,
      base = `${path}/notices/${name}`;
    if (!have) {
      errors.push(`${base}:missing`);
      continue;
    }
    errors.push(...schemaInclusion(have.data, need.data, `${base}/data`, "reading"));
  }
  return errors;
}
