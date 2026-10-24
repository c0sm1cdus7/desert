// The props of AppearanceRoot: none. It reads the chosen appearance from infra/appearance-state.ts and publishes the
// platform colour scheme to infra/appearance-store.ts.
import { Type } from "@sinclair/typebox";

export const AppearanceRootContract = {
  props: Type.Object({}, { additionalProperties: false }),
} as const;
