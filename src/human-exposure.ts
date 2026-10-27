import { Type, type Static } from "@sinclair/typebox";
import { closed, name } from "./views/definition.ts";
import { ViewExposureSchema } from "./program-grammar.ts";
import { requireProgramOwnedNavigation, type WithoutSurfaceNavigation } from "./navigation-ownership.ts";
import { runtimeConnectionPolicyFor } from "./connection-policy.ts";
import type { Frozen } from "./json.ts";

export const AuthoredHumanExposureSchema = closed({
  id: name, kind: Type.Literal("human"), locale: name,
  journeys: Type.Array(name, { minItems: 1, uniqueItems: true }),
});
export const AuthoredExposureSchema = Type.Union([ViewExposureSchema.anyOf[0], AuthoredHumanExposureSchema]);
export type AuthoredHumanExposure = Frozen<Static<typeof AuthoredHumanExposureSchema>>;
const journeyOwnedSurfaceKeys = ["inputs", "fieldRepresentations", "fieldKinds", "commit", "language"] as const;
export type WithoutSurfaceSemantics = WithoutSurfaceNavigation & { readonly connection?: never } & {
  readonly [Key in typeof journeyOwnedSurfaceKeys[number]]?: never;
};

export function requireJourneyOwnedSurfaceSemantics(surface: object): void {
  requireProgramOwnedNavigation(surface);
  runtimeConnectionPolicyFor(surface);
  if (journeyOwnedSurfaceKeys.some(key => Object.hasOwn(surface, key))) {
    throw new Error("SURFACE_SEMANTICS_FORBIDDEN");
  }
}
