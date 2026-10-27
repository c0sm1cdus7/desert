import { Components, ViewTitles, defineView, viewPorts } from "desert-sdk/src/index.ts";
import { m } from "../../../messages/keys.ts";

const Ports = viewPorts({ inputs: { draft: "form" }, outputs: ["save", "close"] });

export const CreateNoteView = defineView({
  name: "create-note", outputs: Ports.outputs,
  topDock: Components.Toolbar({ actions: [{ output: Ports.output.close, label: m.notes.close, icon: "close" }] }),
  bottomDock: Components.Toolbar({ actions: [{ output: Ports.output.save, label: m.notes.createNote, icon: "save" }] }),
  content: [Components.Header({ title: ViewTitles.operation }), Components.Form({ input: Ports.inputs.draft })],
});
