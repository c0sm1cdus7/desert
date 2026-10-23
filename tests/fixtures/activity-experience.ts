import { program } from "./view-program.ts";
import { ViewNotebook } from "./view-exposure.ts";

export const ActivityNotebook = { ...ViewNotebook, surfaces: ViewNotebook.surfaces.map(surface => surface.kind !== "human"
  ? surface : { ...surface, commit: { ...surface.commit, "create-note": "review" as const } }) };

export const guidedProgram = {
  ...program,
  views: [...program.views.filter(view => view.id !== "editor"),
    { version: "desert.view/1", id: "note-title", content: [
      { kind: "header", id: "title", title: "Name your note" }, { kind: "form", id: "form", input: "draft" }] },
    { version: "desert.view/1", id: "note-body", content: [
      { kind: "header", id: "title", title: "Write your note" }, { kind: "form", id: "form", input: "draft" }] },
    { version: "desert.view/1", id: "note-review", content: [{ kind: "context", id: "context", input: "prepared" }] }],
  journeys: program.journeys.map(journey => journey.kind !== "create" ? journey : {
    id: journey.id, kind: "activity", source: journey.source, preferredDock: "right", outputs: [],
    activity: { version: "desert.activity/1", journey: journey.id, steps: [
      { view: "note-title", inputs: ["title"] }, { view: "note-body", inputs: ["body"] }], review: "note-review" },
  }),
} as const;
