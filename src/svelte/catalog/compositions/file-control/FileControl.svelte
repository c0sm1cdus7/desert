<script lang="ts">
  import { Files } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  // The file control is the Files foundation (design §1.3), which reads the local file host from context; Batch 3 deletes
  // this folder.
  let { node, onevent }: CatalogProps<"file-control"> = $props();
</script>
<Files {node} {onevent} />
