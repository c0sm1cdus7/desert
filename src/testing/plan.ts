import type { ProductDefinition } from "../contracts.ts";
import type { Obligation, VerificationCase } from "./types.ts";

export function deriveCases(product: ProductDefinition): VerificationCase[] {
  return (product.journeys ?? []).flatMap(journey => {
    const obligations: Obligation[] = ["success", "inputs", "authority", "atomicity", "recovery"];
    if (journey.kind === "mutation") obligations.push("concurrency");
    if (journey.kind === "mutation" && journey.command.kind === "update") obligations.push("guards");
    const surfaces = product.surfaces?.filter(surface => surface.journeys.includes(journey.id)) ?? [];
    return (surfaces.length ? surfaces.map(surface => surface.id) : [""]).flatMap(surfaceId =>
      obligations.map(obligation => ({
        id: JSON.stringify([surfaceId, journey.id, obligation]),
        journeyId: journey.id, surfaceId, obligation,
      })));
  });
}
