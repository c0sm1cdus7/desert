<script lang="ts">
  import { Check } from "@sinclair/typebox/value";
  import { onMount, tick } from "svelte";
  import { AccessRequests } from "../../../../identity/contract.ts";
  import { m } from "../../../../messages/keys.ts";
  import { Action, AppearancePreferences, Avatar, Column, Field, Form, Heading, Inline, StackLayout, Text } from "../../index.ts";
  import { appearance, appearancePersistence, chooseAppearance } from "../../../infra/appearance-state.ts";
  import { systemScheme } from "../../../infra/appearance-store.ts";
  import type { AppearancePreferences as Preferences } from "../../../infra/appearance-preferences.ts";
  import { newAvatarSeed } from "../../../infra/avatar-seed.ts";
  import { provideFocusScope } from "../../../infra/focus-scope.ts";
  import { say } from "../../../infra/messages.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { mode, busy = false, onsubmit, productLabel = "VOID", preferences, onappearancechange }: CatalogProps<"access-form"> = $props();
  let login = $state(""), displayName = $state(""), password = $state("");
  let avatarSeed = $state(newAvatarSeed());
  let step = $state<1 | 2>(1);
  // The step title registers under this scope; moving between steps asks the scope for it by key, never the element.
  const scope = provideFocusScope();
  let creating = $derived(mode !== "signIn");
  let personal = $derived(preferences ?? $appearance);
  function personalize(value: Preferences) { if (onappearancechange) onappearancechange(value); else chooseAppearance(value); }
  let input = $derived(creating ? { login, displayName, password, avatarSeed } : { login, password });
  let valid = $derived(Check(AccessRequests[mode], input));
  // A new identity starts from an explicit dark or light choice: the system scheme AppearanceRoot published.
  onMount(() => { if (creating && personal.theme === "system") personalize({ ...personal, theme: $systemScheme }); });
  async function move(next: 1 | 2) { step = next; await tick(); scope.focus("access-heading"); }
  async function submit() {
    if (!valid || busy) return;
    if (creating && step === 1) { await move(2); return; }
    const submitted = { login, displayName, password, ...(creating ? { avatarSeed } : {}) };
    await onsubmit(submitted);
    password = "";
    if (creating) await move(1);
  }
  let headline = $derived(!creating ? say(m.accessForm.unlock) : step === 1 ? say(m.accessForm.headlineIdentity, { product: productLabel })
    : say(m.accessForm.headlineAppearance));
  let finish = $derived(busy ? say(m.accessForm.pleaseWait) : !creating ? say(m.accessForm.unlock)
    : step === 1 ? say(m.accessForm.continue) : say(m.accessForm.getStarted));
</script>

<!-- Centred at the reading measure, as the form was (margin-inline:auto); the form starts its fields' text again. -->
<Column gap="relaxed" align="center"><Column gap="relaxed" measure="reading">
  <Form label={creating ? say(m.accessForm.createIdentity) : say(m.accessForm.unlock)} fill={false} submit={() => void submit()}>
    <Column gap="relaxed">
      <Column gap="snug" align="center">
        {#if creating}<Text kind="caption" tone="muted" text={step === 1 ? say(m.accessForm.stepIdentity) : say(m.accessForm.stepAppearance)} />{/if}
        {#if creating && step === 1}<Avatar size="portrait" interaction="shuffle" source={{ kind: "seed", seed: avatarSeed }}
          shuffleLabel={say(m.accessForm.shuffleAvatar)} disabled={busy} onshuffle={value => avatarSeed = value} />{/if}
        <Heading kind="display" text={headline} focusKey="access-heading" />
        {#if creating}<Text kind="body" tone="muted" align="center" text={step === 1 ? say(m.accessForm.introIdentity, { product: productLabel })
          : say(m.accessForm.introAppearance, { product: productLabel })} />{/if}
      </Column>
      {#if step === 1}
        <StackLayout title={say(m.accessForm.identity)}>
          {#if creating}<Field primitive="input.text" label={say(m.accessForm.displayName)} labelVisibility="visible" measure="writing" purpose="text"
            value={displayName} required invalid={false} disabled={busy} clear onchange={value => displayName = value} />{/if}
          <Field primitive="input.text" label={say(m.accessForm.identityName)} labelVisibility="visible" measure="writing" value={login}
            purpose="username" required invalid={false} disabled={busy} clear
            helper={creating ? say(m.accessForm.identityNameHelper) : undefined} onchange={value => login = value} />
          <Field primitive="input.text" label={say(m.accessForm.password)} labelVisibility="visible" measure="writing" value={password}
            purpose={creating ? "new-password" : "current-password"} helper={creating ? say(m.accessForm.passwordHelper) : undefined}
            required invalid={false} disabled={busy} clear onchange={value => password = value} />
        </StackLayout>
      {:else}
        <AppearancePreferences value={personal} onchange={personalize} disabled={busy} />
        {#if !preferences && $appearancePersistence}<Text kind="support" live="polite" text={$appearancePersistence} />{/if}
      {/if}
      <Inline gap="close" justify="center" overflow="wrap">
        {#if creating && step === 2}<Action label={say(m.accessForm.backToIdentity)} icon="back" emphasis="secondary" face="icon" type="button"
          state={busy ? "unavailable" : "ready"} onclick={() => void move(1)} />{/if}
        <Action label={finish} icon="confirm" emphasis="primary" face="text" type="submit" state={busy ? "pending" : valid ? "ready" : "unavailable"} />
      </Inline>
      {#if creating && step === 2}<Text kind="caption" tone="muted" align="center" text={say(m.accessForm.footnote)} />{/if}
    </Column>
  </Form>
</Column></Column>
