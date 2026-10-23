<script lang="ts">
  import { FactGroup } from "./adapter-catalog.ts";
  import type { FactsContent } from "../interaction/surface-frame.ts";
  let { fields, facts, object, labels, multiline = [], images = [], tags = [], references = {} }: Omit<FactsContent, "kind"> = $props();
</script>

<FactGroup {fields} {facts} {object} {labels} {multiline} {images} {tags} {references} />
