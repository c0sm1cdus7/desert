<script lang="ts">
  import { Check } from "@sinclair/typebox/value";
  import { onMount, tick } from "svelte";
  import { AccessRequests } from "../../../../identity/contract.ts";
  import { StackLayout } from "../../index.ts";
  import { TextInput } from "../../index.ts";
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import { AvatarShuffle } from "../../index.ts";
  import { AppearancePreferences } from "../../index.ts";
  import { appearance, appearancePersistence, chooseAppearance } from "../../../infra/appearance-state.ts";
  import type { AppearancePreferences as Preferences } from "../../../infra/appearance-preferences.ts";
  import { newAvatarSeed } from "../../../infra/avatar-seed.ts";
  import { Feedback } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { mode, busy = false, onsubmit, productLabel = "VOID", preferences, onappearancechange }: CatalogProps<"access-form"> = $props();
  let login = $state(""), displayName = $state(""), password = $state("");
  let avatarSeed = $state(newAvatarSeed());
  let step = $state<1 | 2>(1);
  let heading: HTMLHeadingElement;
  let creating = $derived(mode !== "signIn");
  let personal = $derived(preferences ?? $appearance);
  function personalize(value: Preferences) { if (onappearancechange) onappearancechange(value); else chooseAppearance(value); }
  let input = $derived(creating ? { login, displayName, password, avatarSeed } : { login, password });
  let valid = $derived(Check(AccessRequests[mode], input));
  onMount(() => {
    if (creating && personal.theme === "system") personalize({ ...personal, theme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" });
  });
  async function move(next: 1 | 2) { step = next; await tick(); heading?.focus(); }
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!valid || busy) return;
    if (creating && step === 1) { await move(2); return; }
    const submitted = { login, displayName, password, ...(creating ? { avatarSeed } : {}) };
    await onsubmit(submitted);
    password = "";
    if (creating) await move(1);
  }
</script>

<form onsubmit={submit} aria-label={creating ? "Create identity" : "Unlock"} class="access-form">
  <header class="access-form-header">
    {#if creating}<p class="type-caption text-muted-foreground" aria-label={`Step ${step} of 2`}>{step === 1 ? "Identity" : "Appearance"} · {step} of 2</p>{/if}
    {#if creating && step === 1}<AvatarShuffle seed={avatarSeed} disabled={busy} onchange={value => avatarSeed = value} />{/if}
    <h1 bind:this={heading} tabindex="-1">{creating ? step === 1 ? `Make ${productLabel} yours.` : "Feel at home." : "Unlock"}</h1>
    {#if creating}<p class="access-intro">{step === 1 ? `Create your identity to access ${productLabel}.` : `Choose how ${productLabel} looks and feels.`}</p>{/if}
  </header>
  {#if step === 1}
    <StackLayout title="Your identity">
      {#if creating}<TextInput primitive="input.text" label="Display name" value={displayName} required disabled={busy} onchange={value => displayName = value} />{/if}
      <TextInput primitive="input.text" label="Identity name" value={login} purpose="username" required disabled={busy}
        helper={creating ? "3–64 lowercase letters, numbers, dots, hyphens or underscores." : undefined} onchange={value => login = value} />
      <TextInput primitive="input.text" label="Password" value={password} purpose={creating ? "new-password" : "current-password"}
        helper={creating ? "At least 12 characters. Keep the password safe; recovery is not available yet." : undefined}
        required disabled={busy} onchange={value => password = value} />
    </StackLayout>
  {:else}
    <AppearancePreferences value={personal} onchange={personalize} disabled={busy} />
    {#if !preferences && $appearancePersistence}<Feedback text={$appearancePersistence} />{/if}
  {/if}
  <div class="access-actions">
    {#if creating && step === 2}<Button variant="secondary" size="icon-lg" aria-label="Back to identity" disabled={busy} onclick={() => move(1)}><ArrowLeft aria-hidden="true" /></Button>{/if}
    <Button type="submit" disabled={busy || !valid} aria-busy={busy}>{busy ? "Please wait…" : creating ? step === 1 ? "Continue" : "Get started" : "Unlock"}</Button>
  </div>
  {#if creating && step === 2}<p class="access-footnote">You can change all of this in Appearance.</p>{/if}
</form>

<style>
  .access-form { width:min(100%,34rem); margin-inline:auto; display:grid; gap:1.75rem; }
  .access-form-header { display:flex; flex-direction:column; align-items:center; text-align:center; gap:.5rem; }
  .access-form-header h1 { font-size:clamp(1.75rem,4vw,2.75rem); font-weight:650; line-height:1.12; letter-spacing:-.04em; margin:.75rem 0 0; text-wrap:balance; outline:none; }
  .access-intro { color:var(--muted-foreground); margin:0; text-wrap:balance; }
  .access-actions { display:flex; flex-wrap:wrap; gap:.75rem; align-items:center; justify-content:center; }
  .access-footnote { margin:0; text-align:center; color:var(--muted-foreground); font-size:var(--text-caption); }
</style>
