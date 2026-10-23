<script lang="ts">
	import { Label } from "@desert/svelte/vendor/components/ui/label/index.js";
	import { cn } from "@desert/svelte/vendor/utils.js";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		children,
		visibility = "visible",
		...restProps
	}: ComponentProps<typeof Label> & { visibility?: "visible" | "assistive" } = $props();
</script>

<Label
	bind:ref
	data-slot="field-label"
	class={cn(
		"group-data-[invalid=true]/field:text-destructive-text",
		"gap-2 leading-snug has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border has-[>[data-slot=field]]:has-[:focus-visible]:border-ring has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring/50 has-[>[data-slot=field]]:has-[:focus-visible]:ring-3 *:data-[slot=field]:p-2.5 group/field-label peer/field-label flex w-fit",
		"has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
		"[&.sr-only]:w-px [&.sr-only]:max-w-px [&.sr-only]:min-w-0",
		visibility === "assistive" && "sr-only",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</Label>
