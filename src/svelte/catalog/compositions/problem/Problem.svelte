<script lang="ts">
  // The node renderer's problem branch mounts this adapter (`renders: ["problem"]`): it maps the problem node's props onto
  // Dialog, a status face and one Close the person uses unless the problem is locked.
  import { Dialog } from "../../index.ts";
  import { toolbarAction } from "../../../../interaction/toolbar.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { open, title, description, close, severity = "error", locked = false }: CatalogProps<"problem"> = $props();
  let dismissal = $derived(toolbarAction({ kind: "close" }, say(m.problem.close), "close", !locked));
  const dismiss = () => { if (!locked) close(); };
</script>

<Dialog {open} {locked} tone="standard" face={{ kind: "status", severity }} {title} subtitle={description} secondary={dismissal}
  oninvoke={intent => { if (intent.kind === "close") dismiss(); }} ondismiss={dismiss} />
