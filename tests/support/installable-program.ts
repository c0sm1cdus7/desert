// The executable fixture owns file metadata; its tool body has no access to its module or environment.
import { fileURLToPath } from "node:url";
import { defineProgram } from "../../src/tools/installable/program.ts";
import { sampleDefinition, sampleBody } from "./installable-body.ts";
export { sampleBody, type Sample } from "./installable-body.ts";
export const sampleMetadata = {
  ...sampleDefinition,
  code: [import.meta.filename, fileURLToPath(new URL("./installable-body.ts", import.meta.url))],
} as const;
export const sampleProgram = defineProgram(sampleMetadata, sampleBody);
export const presentation = {
  code: [import.meta.filename],
  locale: { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" },
} as const;
export const sampleOptions = {
  programs: [sampleProgram],
  identities: true,
  minds: { assistants: false, programs: [] },
  shown: presentation,
} as const;
