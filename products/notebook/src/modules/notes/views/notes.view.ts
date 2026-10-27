import { Components, defineView, viewPorts } from "desert-sdk/src/index.ts";
import { m } from "../../../messages/keys.ts";

const Ports = viewPorts({ inputs: { notes: "collection" }, outputs: ["create", "select"] });

export const NotesView = defineView({
  name: "notes", outputs: Ports.outputs,
  topDock: Components.Toolbar({ actions: [{ output: Ports.output.create, label: m.notes.createNote, icon: "create" }] }),
  content: [
    Components.Header({ title: m.notes.readNotes, subtitle: m.notes.subtitle }),
    Components.Stack({ title: m.notes.all, items: [Components.Collection({ input: Ports.inputs.notes, output: Ports.output.select })] }),
  ],
});
