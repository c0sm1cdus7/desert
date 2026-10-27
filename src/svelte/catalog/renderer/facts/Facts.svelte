<script lang="ts">
  import { FactGroup } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { fields, facts, object, labels, multiline = [], images = [], tags = [], references = {} }: CatalogProps<"facts"> = $props();
</script>

<FactGroup {fields} {facts} {object} {labels} {multiline} {images} {tags} {references} />
