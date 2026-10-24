<script lang="ts">
	import { cn, type WithElementRef } from "@desert/svelte/vendor/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		presentation = "standard",
		...props
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & { presentation?: "standard" | "access" } = $props();
</script>

<div
	bind:this={ref}
	data-slot="input-group"
	role="group"
	class={cn(
		"material-pane control-focus group/input-group relative flex w-full min-w-0 items-center rounded-lg p-1 has-[textarea]:h-auto has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-offset-3",
		className,
		presentation === "access" && "pr-1.5"
	)}
	{...props}
>
	{@render children?.()}
</div>
