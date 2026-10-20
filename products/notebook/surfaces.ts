import { agentSurface, humanSurface } from "../../src/index.ts";
import { ArchiveNote, CreateNote, ReadNote } from "./journeys.ts";

export const HumanNotebook = humanSurface({
  id: "human",
  journeys: [CreateNote, ReadNote, ArchiveNote],
  entry: ReadNote,
  primaryAction: CreateNote,
  subjectActions: [ArchiveNote],
  inputs: { "note.body": "input.multiline" },
  commit: {
    "create-note": "submit",
    "archive-note": "review",
  },
  language: {
    locale: "en",
    fields: { "note.title": "Title", "note.body": "Content", "note.state": "Status" },
    journeys: { "create-note": "Create note", "read-note": "Read notes", "archive-note": "Archive note" },
  },
  connection: {
    availability: "journey-dependencies",
    draftRetention: "session-memory",
    reconnect: "refresh-without-replay",
  },
});

export const AgentNotebook = agentSurface("agent", [CreateNote, ReadNote, ArchiveNote]);
