// The props of ControlRenderer: the control `node` it draws through the node renderer. `event` carries only that
// control's events; every other node event of the mounted piece stays inside. The local file host a files control needs
// travels by context (infra/file-host-context.ts), never as a prop.
import { Type } from "@sinclair/typebox";
import { ControlEventSchema, ControlNodeSchema } from "../../../../interaction/control-nodes.ts";

export const ControlRendererContract = {
  props: Type.Object({ node: ControlNodeSchema }, { additionalProperties: false }),
  events: Type.Object({ event: ControlEventSchema }, { additionalProperties: false }),
} as const;
