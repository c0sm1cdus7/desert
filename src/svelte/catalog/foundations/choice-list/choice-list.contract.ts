// The props of ChoiceList: none. It only gives its rows one transparent geometry; the rows arrive through `children`.
import { Type } from "@sinclair/typebox";

export const ChoiceListContract = {
  props: Type.Object({}, { additionalProperties: false }),
} as const;
