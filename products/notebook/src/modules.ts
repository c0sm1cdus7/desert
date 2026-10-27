import { moduleIndex } from "desert-sdk/src/index.ts";
import { NotesModule } from "./modules/notes/notes.module.ts";

export const Modules = moduleIndex([NotesModule]);
export const Journeys = Modules.journeys;
export const Views = Modules.views;
export const Commands = Modules.commands;
export const Destinations = Modules.destinations;
export const Dependencies = Modules.dependencies;
