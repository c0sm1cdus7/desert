<script lang="ts">
	import { cn, type WithElementRef } from "@desert/svelte/vendor/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		size = "default",
        interactive = false,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & { interactive?: boolean; size?: "default" | "sm" } = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	data-material="pane"
	data-size={size}
    data-interactive={interactive || undefined}
	class={cn("text-card-foreground overflow-hidden rounded-[var(--radius-group)] group/card flex flex-col data-interactive:tm-control", className)}
	{...restProps}
>
	{@render children?.()}
</div>
