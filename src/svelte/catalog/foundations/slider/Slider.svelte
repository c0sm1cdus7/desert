<script lang="ts">
  import { Slider } from "../../../vendor/components/ui/slider/index.js";
  import type { CatalogProps } from "../../types.d.ts";
  let { label, value, min, max, step, disabled, onchange }: CatalogProps<"slider"> = $props();
</script>
<Slider type="single" {value} {min} {max} {step} {disabled} aria-label={label} onValueChange={next => onchange?.(next)} />
