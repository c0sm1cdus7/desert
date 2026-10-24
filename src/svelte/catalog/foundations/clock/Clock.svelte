<script lang="ts">
  import { onMount } from "svelte";
  let now = $state(new Date());
  onMount(() => { const timer = setInterval(() => now = new Date(), 30000); return () => clearInterval(timer); });
</script>
<div class="clock">
  <p class="clock-date">{new Intl.DateTimeFormat(undefined, { weekday:"long", month:"long", day:"numeric" }).format(now)}</p>
  <time class="clock-time" datetime={now.toISOString()}>{new Intl.DateTimeFormat(undefined, { hour:"2-digit", minute:"2-digit", hour12:false }).format(now)}</time>
</div>
<style>
  .clock { margin:0 0 2rem; max-width:100%; }
  .clock-date { margin:0; text-wrap:balance; }
  .clock-time { display:block; font-size:min(7.6rem,22vw); font-weight:500; letter-spacing:-.085em; line-height:1.15; padding-right:.085em; font-variant-numeric:tabular-nums; }
  @media (max-width:480px) { .clock { margin-bottom:1.5rem; } }
</style>
