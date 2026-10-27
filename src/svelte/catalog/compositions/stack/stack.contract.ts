// The props of Stack (DESIGN §3.0): the place stack it draws (its id, title, description and items). Every item's
// interaction reaches `event` as a node event. The file host its controls read travels by context, never as a prop.
import { Type } from "@sinclair/typebox";
import { StackSchema } from "../../../../interaction/place.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";

export const StackContract = {
  props: Type.Object({ definition: StackSchema }, { additionalProperties: false }),
  events: Type.Object({ event: NodeEventSchema }, { additionalProperties: false }),
} as const;
