import { loadDefinition } from "../compiled-definition.ts";
import type { LocalProgram } from "../local/program.ts";

export function requirePrivateImageMechanism(program: LocalProgram, installed: boolean) {
  if (installed) return;
  const definition = loadDefinition(program.application);
  for (const journey of definition.journeys ?? []) {
    if (!program.roles.includes(journey.requires.controller)) continue;
    const objectId = journey.kind === "read" ? journey.object : journey.command.object;
    const object = definition.objects.find(item => item.id === objectId)!;
    const fields = journey.kind === "read" ? [...journey.fields, ...journey.collection] : journey.command.input;
    if (fields.some(field => object.facts[field]?.kind === "asset")) throw new Error("PRIVATE_IMAGE_STORAGE_NOT_INSTALLED");
  }
}
