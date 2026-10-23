import { freezeDeep } from "../json.ts";
import type { ActivityAnswers, ActivityPlan, ActivityProgress } from "./schema.ts";

export function activityProgress(plan: ActivityPlan, answers: ActivityAnswers,
  completed: readonly number[]): ActivityProgress {
  const input: Record<string, string | number> = {};
  const activeSteps: number[] = [], completedSteps: number[] = [];
  let nextStep: number | null = null;
  for (const [index, step] of plan.steps.entries()) {
    const when = step.when;
    if (when) {
      if (!Object.hasOwn(input, when.input)) break;
      const equal = input[when.input] === when.value;
      if (when.comparison === "equals" ? !equal : equal) continue;
    }
    activeSteps.push(index);
    if (!completed.includes(index)) { nextStep = index; break; }
    completedSteps.push(index);
    Object.assign(input, answers[String(index)] ?? {});
  }
  return freezeDeep({ activeSteps, completedSteps, nextStep, input });
}
