// Declares three bank scenes per role case, awakened by an action or a directed message.
import type { MindActor } from "../../fields/mind-actor.ts";
import type { Emission, Event } from "../../journal/vocabulary.ts";
import type { DelegatedKit } from "../../house/assistants/assistant-facts.ts";
import type { ProposedAct } from "./mind-answer.ts";
export type ProgramMindScene = Readonly<{
  given: readonly Emission[];
  kit: DelegatedKit;
  when: ProposedAct | Readonly<{ kind: "message"; to: MindActor; text: string }>;
  check: (events: readonly Event[]) => boolean;
}>;
export type ProgramMindCase = Readonly<{
  id: string;
  scenes: readonly [ProgramMindScene, ProgramMindScene, ProgramMindScene];
}>;
