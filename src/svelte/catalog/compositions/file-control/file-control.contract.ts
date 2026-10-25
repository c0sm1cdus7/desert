// The props of FileControl: the files control `node` (its files, accepted types and limits) and `event`, raised with
// files.choose or files.remove. The local file host that checks and keeps chosen files travels by context
// (infra/file-host-context.ts), never as a prop.
import { Type } from "@sinclair/typebox";
import { FileNodeSchema, type ControlEvent } from "../../../../interaction/control-nodes.ts";

export const FileControlContract = {
  props: Type.Object({ node: FileNodeSchema }, { additionalProperties: false }),
  events: Type.Object({
    event: Type.Unsafe<Extract<ControlEvent, { kind: `files.${string}` }>>(),
  }, { additionalProperties: false }),
} as const;
