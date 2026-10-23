<script lang="ts">
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import Shuffle from "@lucide/svelte/icons/shuffle";
  import SeedAvatar from "../../foundations/seed-avatar/SeedAvatar.svelte";
  import { newAvatarSeed } from "../../../infra/avatar-seed.ts";
  let { seed, onchange, disabled = false }: { seed: string; onchange: (value: string) => void; disabled?: boolean } = $props();
</script>
<span class="avatar-shuffle">
<Button variant="secondary" size="avatar" aria-label="Shuffle avatar" {disabled} onclick={() => onchange(newAvatarSeed())}>
  <SeedAvatar {seed} /><span class="shuffle-overlay"><Shuffle aria-hidden="true" /></span>
</Button>
</span>
<style>
  .avatar-shuffle { display:inline-flex; position:relative; }
  .shuffle-overlay { position:absolute; inset:0; display:grid; place-items:center; background:#10162199; color:white; opacity:0; }
  .avatar-shuffle:hover .shuffle-overlay, .avatar-shuffle:focus-within .shuffle-overlay { opacity:1; }
  @media (hover:none) { .shuffle-overlay { inset:auto 0 0 auto; width:2rem; height:2rem; border-radius:50%; opacity:1; } }
</style>
