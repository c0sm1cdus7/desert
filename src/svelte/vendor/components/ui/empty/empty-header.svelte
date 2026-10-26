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

<!-- The header (and its title and description, max-w-full) never grows past the notice's column, so its words wrap there by
     the one text policy the notice sets (wrap-words). -->
<div
	bind:this={ref}
	data-slot="empty-header"
	class={cn("gap-2 flex max-w-[min(var(--container-sm),100%)] flex-col items-center", className)}
	{...restProps}
>
	{@render children?.()}
</div>
