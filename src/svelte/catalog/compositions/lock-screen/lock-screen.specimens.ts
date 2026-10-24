// The witness of LockScreen: unlocking the identity remembered on this device.
import type { CatalogSpecimen } from "../../types.d.ts";

export const LockScreenSpecimens = [
  { state: "default", props: {
    profile: { login: "sample-identity", displayName: "Sample identity", avatarSeed: "0011223344556677" },
    onsubmit: async () => {},
  } },
] as const satisfies readonly CatalogSpecimen<"lock-screen">[];
