// The props of Information: the ordered items of an information block, each a reading paragraph or a labelled fact,
// as the domain's InformationItemSchema defines them.
import { Type } from "@sinclair/typebox";
import { InformationItemSchema } from "../../../../interaction/information-content.ts";

export const InformationContract = {
  props: Type.Object({ items: Type.Array(InformationItemSchema) }, { additionalProperties: false }),
} as const;
