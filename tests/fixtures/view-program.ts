import { compile } from "../../src/compile.ts";
import { Notebook } from "../../products/notebook/product.ts";
import { CreateNote, ReadNote } from "../../products/notebook/journeys.ts";
import type { HumanSurface } from "../../src/web/types.ts";
import type { ViewProgram } from "../../src/views/program-schema.ts";
import { ViewNotebook } from "./view-exposure.ts";
import { WorkspaceView, workspaceViews } from "./workspace-view.ts";

export const surface = compile(ViewNotebook).surface("human") as HumanSurface;
export const program = {
  version: "desert.view-program/4", productId: Notebook.id, label: "Notebook", workspace: WorkspaceView.id,
  views: [
    { version: "desert.view/1", id: "home", outputs: ["notes"],
      content: [{ kind: "header", id: "heading", title: "Home", subtitle: "Your notebook." },
        { kind: "stack", id: "destinations", title: "Explore", items: [
          { kind: "destination-link", id: "notes-link", output: "notes", label: "Notes" }] }] },
    { version: "desert.view/1", id: "notes", outputs: ["create", "select"],
      topDock: { kind: "toolbar", actions: [{ output: "create", label: "New note", icon: "create" }] },
      content: [{ kind: "header", id: "heading", title: "Notes", subtitle: "Private writing." },
        { kind: "stack", id: "all", title: "All notes", items: [
          { kind: "collection", id: "records", input: "records", output: "select" }] }] },
    { version: "desert.view/1", id: "detail", outputs: ["close"],
      topDock: { kind: "toolbar", actions: [{ output: "close", label: "Close", icon: "close" }] },
      content: [{ kind: "header", id: "heading", title: "Note", subtitle: "Read your note." },
        { kind: "context", id: "context", input: "detail" }] },
    { version: "desert.view/1", id: "editor", outputs: ["close", "save"],
      topDock: { kind: "toolbar", actions: [{ output: "close", label: "Close", icon: "close" }] },
      bottomDock: { kind: "toolbar", actions: [{ output: "save", label: "Create note", icon: "save" }] },
      content: [{ kind: "header", id: "heading", title: "New note", subtitle: "Write something." },
        { kind: "form", id: "form", input: "draft" }] },
    { version: "desert.view/1", id: "catalog", content: [
      { kind: "header", id: "heading", title: "Visual catalog", subtitle: "Installed pieces." },
      { kind: "visual-catalog", id: "inspection" }] },
    ...workspaceViews,
  ],
  journeys: [
    { id: "home", kind: "presentation", view: "home", outputs: [
      { view: "home", output: "notes", action: { kind: "journey", journey: ReadNote.id } }] },
    { id: ReadNote.id, kind: "read", view: "notes", detailView: "detail", outputs: [
      { view: "notes", output: "create", action: { kind: "journey", journey: CreateNote.id } },
      { view: "notes", output: "select", action: { kind: "select" } },
      { view: "detail", output: "close", action: { kind: "close" } }] },
    { id: CreateNote.id, kind: "create", source: ReadNote.id, view: "editor", preferredDock: "right", outputs: [
      { view: "editor", output: "save", action: { kind: "submit" } },
      { view: "editor", output: "close", action: { kind: "close" } }] },
    { id: "catalog", kind: "presentation", view: "catalog", outputs: [] },
  ],
  destinations: [
    { id: "home", label: "Home", icon: "open", entryJourney: "home" },
    { id: "notes", label: "Notes", icon: "open", entryJourney: ReadNote.id },
    { id: "catalog", label: "Visual catalog", icon: "catalog", entryJourney: "catalog" },
  ],
  entry: "home", navigation: [
    { destination: "home", group: "Explore", purpose: "content" },
    { destination: "notes", group: "Explore", purpose: "content" },
    { destination: "catalog", group: "Developer", purpose: "utility" },
  ],
} as const satisfies ViewProgram;
