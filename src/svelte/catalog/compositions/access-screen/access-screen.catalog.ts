// AccessScreen: the sign-in place of the product; it applies the saved appearance and mounts the access experience
// with the access client and the profile remembered on this device.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AccessScreenContract } from "./access-screen.contract.ts";

export const AccessScreen = defineComposition({
  id: "access-screen",
  purpose: { key: "accessScreen.purpose" }, messages: ["accessScreen.purpose"],
  owner: { entry: "AccessScreen.svelte" },
  uses: ["access-experience", "appearance-root"], approval: "none", contract: AccessScreenContract,
} as const);
