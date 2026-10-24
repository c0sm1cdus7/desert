// One witness per size of SeedAvatar, in its only state.
import type { CatalogSpecimen } from "../../types.d.ts";

export const SeedAvatarSpecimens = [
  { state: "default", variants: { size: "portrait" }, props: { seed: "3f9a1c07d2e85b46", label: "Ada's avatar", size: "portrait" } },
  { state: "default", variants: { size: "compact" }, props: { seed: "3f9a1c07d2e85b46", label: "Ada's avatar", size: "compact" } },
] as const satisfies readonly CatalogSpecimen<"seed-avatar">[];
