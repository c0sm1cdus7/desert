// Declara los casos del rol de un programa: tres escenas con preparación, despertar y comprobación del diario.
import type { Emission, Event } from "../../journal/vocabulary.ts";
import type { DelegatedKit } from "../../house/assistants/assistant-facts.ts";
import type { ProposedAct } from "./mind-answer.ts";
export type ProgramMindScene = Readonly<{
  given: readonly Emission[];
  kit: DelegatedKit;
  when: ProposedAct;
  check: (events: readonly Event[]) => boolean;
}>;
export type ProgramMindCase = Readonly<{
  id: string;
  scenes: readonly [ProgramMindScene, ProgramMindScene, ProgramMindScene];
}>;
