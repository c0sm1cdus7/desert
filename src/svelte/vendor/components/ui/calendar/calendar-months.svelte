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
	class={cn("relative flex min-w-0 max-w-full flex-col gap-4 md:flex-row", className)}
	{...restProps}
>
	{@render children?.()}
</div>
