<script lang="ts">
	import { Avatar as AvatarPrimitive } from "bits-ui";
	import { cn } from "@desert/svelte/vendor/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		initials,
		children,
		...restProps
	}: AvatarPrimitive.FallbackProps & { initials?: string } = $props();
</script>

<AvatarPrimitive.Fallback
	bind:ref
	data-slot="avatar-fallback"
	class={cn(
		"text-secondary-foreground rounded-[inherit] flex size-full items-center justify-center group-data-[shape=object]/avatar:text-inherit",
		initials && Array.from(initials).length > 2 ? "text-(length:--text-initials-compact) leading-none font-normal" : "type-body group-data-[size=sm]/avatar:text-xs",
		className
	)}
	{...restProps}
>
	{#if initials !== undefined}{initials}{:else}{@render children?.()}{/if}
</AvatarPrimitive.Fallback>
