<script lang="ts">
  import { Check } from "@sinclair/typebox/value";
  import { onMount, tick } from "svelte";
  import { AccessRequests } from "../../../../identity/contract.ts";
  import { m } from "../../../../messages/keys.ts";
  import { AppearancePreferences, Avatar, Bar, Column, Field, Form, Heading, StackLayout, Text } from "../../index.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
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
  const uid = $props.id(), formId = `${uid}-form`;
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
  /** Cancel discards what was typed (the step starts again); Back returns to the identity and keeps it. */
  function cancel() { login = ""; displayName = ""; password = ""; }
  function invoke(intent: SurfaceIntent) { if (busy) return; if (intent.kind === "back") void move(1); else if (intent.kind === "close") cancel(); }
  let finish = $derived(busy ? say(m.accessForm.pleaseWait) : !creating ? say(m.accessForm.unlock)
    : step === 1 ? say(m.accessForm.continue) : say(m.accessForm.getStarted));
</script>

<!-- Centred at the reading measure, as the form was (margin-inline:auto); the form starts its fields' text again. -->
<Column gap="relaxed" align="center"><Column gap="relaxed" measure="reading">
  <Form id={formId} label={creating ? say(m.accessForm.createIdentity) : say(m.accessForm.unlock)} fill={false} submit={() => void submit()}>
    <!-- Its blocks stand 1.75rem apart, as at 79d8322 (third review: the 1.5rem step read 4px tighter). -->
    <Column gap="ample">
      <!-- The header's rhythm (79d8322): caption and avatar .5rem apart, the headline 1.25rem below them (its old .75rem
           margin over the .5rem gap), its intro .5rem below it. -->
      <Column gap="loose" align="center">
        {#if creating}
          <Column gap="snug" align="center">
            <Text kind="caption" tone="muted" text={step === 1 ? say(m.accessForm.stepIdentity) : say(m.accessForm.stepAppearance)} />
            {#if step === 1}<Avatar size="portrait" interaction="shuffle" source={{ kind: "seed", seed: avatarSeed }}
              shuffleLabel={say(m.accessForm.shuffleAvatar)} disabled={busy} onshuffle={value => avatarSeed = value} />{/if}
          </Column>
        {/if}
        <Column gap="snug" align="center">
          <Heading kind="display" text={headline} focusKey="access-heading" />
          {#if creating}<Text kind="body" tone="muted" align="center" text={step === 1 ? say(m.accessForm.introIdentity, { product: productLabel })
            : say(m.accessForm.introAppearance, { product: productLabel })} />{/if}
        </Column>
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
      <!-- The bottom of an action (law 9c): Bar's steps pair, text only, each half of the row. Cancel (step 1, it discards
           what was typed) or Back (step 2, it keeps it) on the left; Continue (until the step holds what it declares,
           unavailable) or the verb on the right, which submits the form. It stands in the form's column: its targets span
           the column, on its fields' edges. -->
      <Bar edge="bottom" purpose="steps" identityRole="heading" trailing={[]} settingsPlaceholder={false} inert={false} column oninvoke={invoke}
        secondary={creating && step === 2
          ? { label: say(m.accessForm.back), icon: "back", state: busy ? "unavailable" : "ready", intent: { kind: "back" } }
          : { label: say(m.accessForm.cancel), icon: "close", state: busy ? "unavailable" : "ready", intent: { kind: "close" } }}
        primary={{ label: finish, icon: "confirm", state: busy ? "pending" : valid ? "ready" : "unavailable", intent: { kind: "accept" }, submit: formId }} />
      {#if creating && step === 2}<Text kind="caption" tone="muted" align="center" text={say(m.accessForm.footnote)} />{/if}
    </Column>
  </Form>
</Column></Column>
