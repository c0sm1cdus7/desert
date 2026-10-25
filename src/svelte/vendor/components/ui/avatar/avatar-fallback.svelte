<script lang="ts">
	import { Avatar as AvatarPrimitive } from "bits-ui";
	import { cn } from "@desert/svelte/vendor/utils.js";

	// A fallback holds a drawing (the seed portrait); it never spells initials.
	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: AvatarPrimitive.FallbackProps = $props();
</script>

<AvatarPrimitive.Fallback
	bind:ref
	data-slot="avatar-fallback"
	class={cn("rounded-[inherit] flex size-full items-center justify-center", className)}
	{...restProps}
>
	{@render children?.()}
</AvatarPrimitive.Fallback>
