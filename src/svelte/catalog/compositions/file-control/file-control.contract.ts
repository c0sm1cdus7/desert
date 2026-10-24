// The props of FileControl: the files control `node` (its files, accepted types and limits), the local file `host` that
// checks and keeps chosen files, and `onevent`, raised with files.choose or files.remove.
import { Type } from "@sinclair/typebox";
import type { ControlEvent, ControlNode } from "../../../../interaction/control-nodes.ts";
import type { LocalFileHost } from "../../../infra/file-host.ts";

export const FileControlContract = {
  props: Type.Object({
    node: Type.Unsafe<Extract<ControlNode, { kind: "files" }>>(),
    host: Type.Unsafe<LocalFileHost>(),
  }, { additionalProperties: false }),
  events: Type.Object({
    event: Type.Unsafe<Extract<ControlEvent, { kind: `files.${string}` }>>(),
  }, { additionalProperties: false }),
} as const;
