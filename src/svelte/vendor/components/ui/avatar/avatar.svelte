<script lang="ts">
	import { Avatar as AvatarPrimitive } from "bits-ui";
	import { cn } from "@desert/svelte/vendor/utils.js";

	let {
		ref = $bindable(null),
		loadingStatus = $bindable("loading"),
		size = "default",
		shape = "person",
		class: className,
		...restProps
	}: AvatarPrimitive.RootProps & {
		size?: "default" | "sm" | "lg" | "portrait" | "compact";
		shape?: "person" | "object";
	} = $props();
</script>

<AvatarPrimitive.Root
	bind:ref
	bind:loadingStatus
	data-slot="avatar"
	data-size={size}
	data-shape={shape}
	class={cn(
		"size-8 data-[size=lg]:size-10 data-[size=sm]:size-6 data-[size=portrait]:size-[5.625rem] data-[size=compact]:size-11 overflow-hidden group/avatar flex shrink-0 select-none tm-face",
		shape === "person" ? "rounded-full" : "rounded-[var(--radius-face)]",
		className
	)}
	{...restProps}
/>
