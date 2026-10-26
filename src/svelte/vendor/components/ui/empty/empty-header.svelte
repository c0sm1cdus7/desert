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

<!-- In a notice whose column is narrower than 14rem of text, a word of ten letters or more that cannot fit its line breaks
     at a syllable with its hyphen (the notice's lang names the language); a shorter word is never hyphenated. The header (and
     its title and description, max-w-full) never grows past the notice's column, so a word that still cannot fit breaks
     there, as the last resort (the notice's break-word). -->
<div
	bind:this={ref}
	data-slot="empty-header"
	class={cn("gap-2 flex max-w-[min(var(--container-sm),100%)] flex-col items-center @max-[14rem]/notice:hyphens-auto @max-[14rem]/notice:[hyphenate-limit-chars:10]", className)}
	{...restProps}
>
	{@render children?.()}
</div>
