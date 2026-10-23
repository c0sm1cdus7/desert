<script lang="ts">
  let { required,placement='inline' }: { required:boolean;placement?:'inline'|'overlay' } = $props();
</script>
{#if required}<span data-attention-indicator data-attention-placement={placement} role="img" aria-label="Requires attention"></span>{/if}
<style>
  [data-attention-indicator] { display:inline-block; flex:0 0 auto; width:8px; height:8px; border-radius:50%; background:var(--warning); box-shadow:0 0 0 3px color-mix(in srgb,var(--warning) 14%,transparent); animation:attention-pulse 1.8s ease-in-out infinite; }
  [data-attention-placement="overlay"] { position:absolute; top:var(--well-padding,16px); right:var(--well-padding,16px); z-index:2; }
  @keyframes attention-pulse { 0%,100% { opacity:1; } 50% { opacity:.55; } }
  @media(prefers-reduced-motion:reduce) { [data-attention-indicator] { animation:none; } }
</style>
