<script lang="ts">
	import { cn, type WithElementRef } from "@desert/svelte/vendor/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<!-- The notice's inset is a step of the spacing scale read from its own width (it fills its host; percentage padding
     reads that width, never the viewport's): relaxed, and regular once the notice is narrower than 16rem of text (a phone
     at large text), so its column is as wide as the scale allows. Its header hyphenates in a narrow column
     (empty-header); a word that still cannot fit breaks only as the last resort (break-word). -->
<div
	bind:this={ref}
	data-slot="empty"
	class={cn(
		"@container/notice gap-4 rounded-xl border-dashed p-[clamp(var(--spacing-regular),(100%_-_16rem)_*_1000,var(--spacing-relaxed))] flex w-full min-w-0 flex-1 flex-col items-center justify-center text-center text-balance wrap-break-word",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
