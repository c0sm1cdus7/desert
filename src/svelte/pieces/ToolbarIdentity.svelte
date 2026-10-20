<script lang="ts">
  import type { PlaceIdentity } from './place-identity.ts';
  let { identity, element = $bindable(null) }: { identity: PlaceIdentity; element?: HTMLDivElement | null } = $props();
</script>

<!-- A visual continuation, not a second heading or another focus stop. -->
<div bind:this={element} data-toolbar-identity aria-hidden="true">
  <span class="type-title truncate" data-identity-title>{identity.title}</span>
  <span class="type-caption truncate" data-identity-subtitle>{identity.subtitle}</span>
</div>
