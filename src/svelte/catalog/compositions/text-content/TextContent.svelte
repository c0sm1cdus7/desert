<script lang="ts">
  import Information from "../information/Information.svelte";
  let { text }: { text: string } = $props();
</script>

<!-- Reading placement belongs to this catalog composition, never its adapter. -->
<div data-stack-item data-stack-placement="content"><Information items={[{ kind: "text", text }]} /></div>
