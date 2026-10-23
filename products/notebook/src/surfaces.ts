import { agentSurface, humanSurface } from "desert-sdk/src/index.ts";
import { Journeys } from "./modules.ts";

const ExposedJourneys = [Journeys.createNote, Journeys.readNotes, Journeys.archiveNote] as const;
export const HumanNotebook = humanSurface({ id: "human", journeys: ExposedJourneys, locale: "en" });
export const AgentNotebook = agentSurface("agent", ExposedJourneys);
