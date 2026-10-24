// Fact list takes no props: its rows are its children.
import { Type } from "@sinclair/typebox";

export const FactListContract = {
  props: Type.Object({}, { additionalProperties: false }),
} as const;
