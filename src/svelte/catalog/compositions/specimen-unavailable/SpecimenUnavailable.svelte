<script lang="ts">
  import { Status } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { reason }: CatalogProps<"specimen-unavailable"> = $props();
</script>

<Status label={say(m.specimenUnavailable.label)} title={say(m.specimenUnavailable.title)} description={reason}
  icon="info" tone="note" size="compact" heading={false} />
