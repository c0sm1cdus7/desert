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

<div
	bind:this={ref}
	data-slot="card-title"
	class={cn("type-section", className)}
	{...restProps}
>
	{@render children?.()}
</div>
