import { agentExposure, humanExposure } from "desert-sdk/src/index.ts";
import { Journeys } from "./modules.ts";

const ExposedJourneys = [Journeys.createNote, Journeys.readNotes, Journeys.archiveNote] as const;
export const HumanNotebook = humanExposure({ id: "human", journeys: ExposedJourneys, locale: "en" });
export const AgentNotebook = agentExposure("agent", ExposedJourneys);
