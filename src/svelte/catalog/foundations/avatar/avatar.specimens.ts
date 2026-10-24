// One witness of Avatar per size, decorative and as the shuffle button: a seeded portrait, a picture with its initials,
// initials alone, and the seed that shuffles.
import type { CatalogSpecimen } from "../../types.d.ts";

export const AvatarSpecimens = [
  { state: "default", variants: { size: "portrait", interaction: "none" },
    props: { size: "portrait", interaction: "none", source: { kind: "seed", seed: "3f9a1c07d2e85b46" }, label: "Ada's avatar" } },
  { state: "default", variants: { size: "compact", interaction: "none" },
    props: { size: "compact", interaction: "none", source: { kind: "image", source: "/bank-image.svg", initials: "AR" }, label: "Alex Rivera" } },
  { state: "default", variants: { size: "row", interaction: "none" },
    props: { size: "row", interaction: "none", source: { kind: "initials", initials: "AR" } } },
  { state: "default", variants: { size: "portrait", interaction: "shuffle" },
    props: { size: "portrait", interaction: "shuffle", source: { kind: "seed", seed: "3f9a1c07d2e85b46" }, shuffleLabel: "Shuffle avatar",
      onshuffle: (seed: string) => void seed } },
  { state: "default", variants: { size: "compact", interaction: "shuffle" },
    props: { size: "compact", interaction: "shuffle", source: { kind: "seed", seed: "0011223344556677" }, shuffleLabel: "Shuffle avatar",
      disabled: true, onshuffle: (seed: string) => void seed } },
  { state: "default", variants: { size: "row", interaction: "shuffle" },
    props: { size: "row", interaction: "shuffle", source: { kind: "seed", seed: "a1b2c3d4e5f60718" }, shuffleLabel: "Shuffle avatar",
      onshuffle: (seed: string) => void seed } },
] as const satisfies readonly CatalogSpecimen<"avatar">[];
