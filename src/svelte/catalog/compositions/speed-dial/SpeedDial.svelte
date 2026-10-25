<script lang="ts">
  import { Menu } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  // The speed dial is the Menu foundation (design §1.3); its callers move to Menu and Batch 3 deletes this folder.
  let { actions, open, onchange, invoke, kind = "overflow" }: CatalogProps<"speed-dial"> = $props();
</script>
<Menu label={kind === "create" ? say(m.speedDial.create) : say(m.speedDial.more)} icon={kind === "create" ? "create" : "more"}
  {actions} {open} align="end" onopenchange={onchange} oninvoke={invoke} />
