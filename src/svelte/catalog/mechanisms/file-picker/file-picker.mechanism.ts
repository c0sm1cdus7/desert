// The browser's own file chooser (a hidden native input, opened and removed per choice): owned by files, which opens it for
// a files control, and used by shell, which offers it to the workspace's file host for the create-from-file journey.
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const FilePickerMechanism = defineMechanism({ id: "file-picker", owner: "files", files: ["file-picker.ts"] } as const);
