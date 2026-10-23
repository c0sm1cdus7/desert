<script lang="ts">
	import { cn, type WithElementRef, type WithoutChildren } from "@desert/svelte/vendor/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		line,
		...restProps
	}: WithoutChildren<WithElementRef<HTMLAttributes<HTMLDivElement>>> & { line?: "primary" | "secondary" } = $props();
</script>

<div
	bind:this={ref}
	data-slot="skeleton"
	class={cn("bg-muted rounded-md animate-pulse motion-reduce:animate-none", line === "primary" && "h-4 w-2/3 max-w-64", line === "secondary" && "h-4 w-1/3 max-w-40", className)}
	{...restProps}
></div>
