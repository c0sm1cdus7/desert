// The props of Specimen: the resolved node it witnesses and the scenario (`state`) it witnesses it in, the human surface
// and read-model scope its example data comes from, and the generated input validator for its form scenario.
import { Type } from "@sinclair/typebox";
import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
import type { HumanSurface, ValidateInput } from "../../../../web/types.ts";
import type { ReadModelScope } from "../../../../web/client/model-scope.ts";

export const SpecimenContract = {
  props: Type.Object({
    id: Type.Unsafe<ResolvedNodeId>(),
    state: Type.String(),
    surface: Type.Unsafe<HumanSurface>(),
    validateInput: Type.Unsafe<ValidateInput>(),
    scope: Type.Unsafe<ReadModelScope>(),
  }, { additionalProperties: false }),
} as const;
