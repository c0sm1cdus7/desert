<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Column, NodeRenderer, Text } from "../../index.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  let { details, recovery }: CatalogProps<"review"> = $props();
</script>
<!-- The recovery note stands 1rem under the prepared facts, in the muted body ink, announced when it appears. -->
<Column gap="regular">
  <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "fact", details }} />
  {#if recovery}<Text kind="body" tone="muted" live="polite" text={recovery} />{/if}
</Column>
