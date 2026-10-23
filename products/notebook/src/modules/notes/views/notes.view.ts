import { Components, defineView, viewPorts } from "desert-sdk/src/index.ts";

const Ports = viewPorts({ inputs: { notes: "collection" }, outputs: ["create", "select"] });

export const NotesView = defineView({
  name: "notes", outputs: Ports.outputs,
  topDock: Components.Toolbar({ actions: [{ output: Ports.output.create, label: "Create note", icon: "create" }] }),
  content: [
    Components.Header({ title: "Read notes", subtitle: "Your private notebook." }),
    Components.Stack({ title: "Notes", items: [Components.Collection({ input: Ports.inputs.notes, output: Ports.output.select })] }),
  ],
});
