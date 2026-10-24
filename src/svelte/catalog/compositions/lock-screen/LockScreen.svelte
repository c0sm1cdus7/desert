<script lang="ts">
  import { onMount } from "svelte";
  import { Check } from "@sinclair/typebox/value";
  import { AccessRequests, type AccessInput } from "../../../../identity/contract.ts";
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import * as Group from "../../../vendor/components/ui/input-group/index.js";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Loader from "@lucide/svelte/icons/loader-circle";
  import { FieldWell } from "../../index.ts";
  import { MeasuredField } from "../../index.ts";
  import { SeedAvatar } from "../../index.ts";
  import { TextInput } from "../../index.ts";
  import { StackLayout } from "../../index.ts";
  import type { AccessProfile } from "../../../infra/access-profile.ts";
  let { profile = null, busy = false, onsubmit }: {
    profile?: AccessProfile | null; busy?: boolean; onsubmit: (input: AccessInput<"signIn">) => Promise<void>;
  } = $props();
  let another = $state(false), login = $state(""), password = $state("");
  let now = $state(new Date());
  let known = $derived(profile && !another);
  let input = $derived({ login: known ? profile!.login : login, password });
  let valid = $derived(Check(AccessRequests.signIn, input));
  const id = $props.id();
  onMount(() => { const timer = setInterval(() => now = new Date(), 30000); return () => clearInterval(timer); });
  async function submit(event: SubmitEvent) {
    event.preventDefault(); if (!valid || busy) return;
    const submitted = input; password = ""; await onsubmit(submitted);
  }
</script>
<div class="lock-screen">
  <div class="lock-time"><p>{new Intl.DateTimeFormat(undefined, { weekday:"long", month:"long", day:"numeric" }).format(now)}</p>
    <time datetime={now.toISOString()}>{new Intl.DateTimeFormat(undefined, { hour:"2-digit", minute:"2-digit", hour12:false }).format(now)}</time></div>
  {#if known}<SeedAvatar seed={profile!.avatarSeed} label={`${profile!.displayName}'s avatar`} /><h1>{profile!.displayName}</h1>{:else}<h1>Unlock</h1>{/if}
  <form onsubmit={submit} aria-label="Unlock" class="lock-form">
    <StackLayout title="Your identity" headingVisibility="accessible">
      {#if !known}<TextInput primitive="input.text" label="Identity name" purpose="username" value={login} disabled={busy} onchange={value => login = value} />{/if}
      <div class="unlock-field"><MeasuredField kind="input.text" disabled={busy}>
        <FieldWell id={`${id}-password`} label="Password" filled={password.length > 0} presentation="access">
          <Group.Input id={`${id}-password`} type="password" autocomplete="current-password" bind:value={password}
            aria-label="Password" placeholder=" " disabled={busy} />
          {#snippet accessory()}<Button type="submit" variant="secondary" size="icon-lg" aria-label="Unlock"
            disabled={busy || !valid} aria-busy={busy}>{#if busy}<Loader aria-hidden="true" />{:else}<ArrowRight aria-hidden="true" />{/if}</Button>{/snippet}
        </FieldWell>
      </MeasuredField></div>
    </StackLayout>
  </form>
  {#if known}<Button variant="secondary" wrap disabled={busy} onclick={() => { another = true; password = ""; }}>Use another identity</Button>{/if}
</div>
<style>
  .lock-screen { display:flex; flex-direction:column; align-items:center; gap:1rem; text-align:center; width:min(100%,30rem); min-width:0; margin:auto; }
  .lock-time { margin:0 0 2rem; max-width:100%; }
  .lock-time p { margin:0; text-wrap:balance; }
  time { display:block; font-size:min(7.6rem,22vw); font-weight:500; letter-spacing:-.085em; line-height:1.15; padding-right:.085em; font-variant-numeric:tabular-nums; }
  h1 { font-size:1.6rem; line-height:1.2; font-weight:650; margin:.25rem 0 .75rem; text-wrap:balance; overflow-wrap:anywhere; }
  .lock-form { width:100%; display:grid; gap:1rem; text-align:left; }
  @media (max-width:480px) { .lock-time { margin-bottom:1.5rem; } }
</style>
