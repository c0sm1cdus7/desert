import type { Application } from "../local/program.ts";
import { loadDefinition } from "../compiled-definition.ts";
import { compileViewProgram } from "../views/program.ts";
import { installedActivityIndex } from "./activity-index.ts";
import type { Mutation } from "../local/types.ts";

export function viewProgramActivities(application: Application, input: unknown, surface: string) {
  const program = compileViewProgram(input, application.surface(surface));
  const experiences = program.journeys.filter(journey => journey.kind === "activity");
  if (!experiences.length) return undefined;
  const definitions = loadDefinition(application).journeys ?? [];
  const journeys = experiences.map(experience => {
    const journey = definitions.find(journey => journey.id === experience.id);
    if (!journey || journey.kind !== "mutation") throw new Error("ACTIVITY_OPERATION_NOT_INSTALLED");
    return journey as Mutation;
  });
  const used = new Set(experiences.flatMap(item => [item.activity.review, ...item.activity.steps.map(step => step.view)]));
  const catalog = installedActivityIndex(application, journeys, program.views.filter(view => used.has(view.id)));
  experiences.forEach(experience => catalog.admit(experience.activity));
  return catalog;
}
