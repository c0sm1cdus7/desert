// LocalExerciseContent: the local exercises place, kept as a draft that its own events reduce.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { LocalExerciseContentContract } from "./local-exercise-content.contract.ts";

export const LocalExerciseContent = defineComposition({
  id: "local-exercise-content",
  purpose: { key: "localExerciseContent.purpose" },
  messages: ["localExerciseContent.purpose"],
  owner: { entry: "LocalExerciseContent.svelte" },
  uses: ["place-content"], approval: "none", contract: LocalExerciseContentContract,
} as const);
