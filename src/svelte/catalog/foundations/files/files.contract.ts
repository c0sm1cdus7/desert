// The props of Files: the files control `node` (its label, the files already chosen, the accepted types and limits).
// The local file host that checks and keeps chosen files travels by context (infra/file-host-context.ts), never as a
// prop. It emits `event` with files.choose when the person chooses files and files.remove when they remove one.
import { Type } from "@sinclair/typebox";
import { FileNodeSchema, type ControlEvent } from "../../../../interaction/control-nodes.ts";

export const FilesContract = {
  props: Type.Object({ node: FileNodeSchema }, { additionalProperties: false }),
  events: Type.Object({
    event: Type.Unsafe<Extract<ControlEvent, { kind: `files.${string}` }>>(),
  }, { additionalProperties: false }),
  marks: ["data-files"],
} as const;
