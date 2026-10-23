<script lang="ts">
  import type { Toolbar } from "../../interaction/toolbar.ts";
  import type { SurfaceIntent } from "../../interaction/intent.ts";
  import type { ToolbarControls } from "./toolbar-controls.ts";
  import ToolbarLayout from "./ToolbarLayout.svelte";
  let { toolbar, invoke, submit, presentation = "standard", controls }: {
    toolbar: Toolbar; invoke: (intent: SurfaceIntent) => void; submit?: string;
    presentation?: "standard" | "message" | "transient"; controls?: ToolbarControls;
  } = $props();
</script>

<ToolbarLayout content={{kind:"commands",toolbar,invoke,submit,presentation,controls}} />
