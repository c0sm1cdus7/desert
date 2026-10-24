// Loading: content on its way, as skeleton lines or a spinner, announced by its label. It owns the vendor skeleton and
// spinner families.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { LoadingContract } from "./loading.contract.ts";

export const Loading = defineFoundation({
  id: "loading",
  purpose: "Show that content is on its way, as skeleton lines or a spinner, and announce it by its label.",
  owner: { entry: "Loading.svelte", vendor: ["skeleton", "spinner"] },
  shape: "radius", states: ["default"],
  variants: { kind: ["lines", "spinner"] },
  approval: "required", contract: LoadingContract,
} as const);
