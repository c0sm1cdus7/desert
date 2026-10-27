<script lang="ts">
	// The owner (modal) decides dismissal, including when its surface becomes inactive; the root only holds open state.
	import { Dialog as DialogPrimitive } from "bits-ui";

	let { open = $bindable(false), ...restProps }: DialogPrimitive.RootProps = $props();
</script>

<DialogPrimitive.Root bind:open {...restProps} />
