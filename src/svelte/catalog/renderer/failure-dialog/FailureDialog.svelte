<script lang="ts">
  import { Dialog } from "../../index.ts";
  import { toolbarAction } from "../../../../interaction/toolbar.ts";
  import { failureFeedback } from "../../../../web/client/failure-feedback.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { code, uncertain = false, close }: CatalogProps<"failure-dialog"> = $props();
  let feedback = $derived(failureFeedback(code, uncertain));
  const dismiss = toolbarAction({ kind: "close" }, say(m.failureDialog.close), "close");
</script>

{#if code}
  <Dialog open locked={false} tone="standard" face={{ kind: "status", severity: "error" }} title={feedback.title}
    subtitle={feedback.description} secondary={dismiss} oninvoke={close} ondismiss={close} />
{/if}
