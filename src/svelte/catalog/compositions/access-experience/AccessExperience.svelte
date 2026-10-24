<script lang="ts">
  import { m } from "../../../../messages/keys.ts";
  import { AccessForm, Action, Column, Heading, Inline, LockScreen, StackLayout, Surface, Text } from "../../index.ts";
  import { appearance } from "../../../infra/appearance-state.ts";
  import { say } from "../../../infra/messages.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { productLabel, current, authenticate, refresh, profile = null, preferences, onappearancechange }: CatalogProps<"access-experience"> = $props();
</script>
<Surface kind="page" backdrop={(preferences ?? $appearance).wallpaper} searching={false}>
  {#snippet top()}<Heading kind="page" text={productLabel} />{/snippet}
  {#snippet content()}
    <Column gap="relaxed">
      {#if current.state.kind === "onboarding"}
        <AccessForm mode="initialize" {productLabel} {preferences} {onappearancechange} busy={current.busy} onsubmit={input => authenticate("initialize", input)} />
      {:else if current.state.kind === "locked"}
        <LockScreen {profile} busy={current.busy} onsubmit={input => authenticate("signIn", input)} />
      {:else}
        <StackLayout title={say(m.accessExperience.access)}>
          <Text kind="support" live="polite" text={current.state.kind === "checking" ? say(m.accessExperience.connecting) : say(m.accessExperience.unavailable)} />
          {#if current.state.kind === "unavailable"}<Action label={say(m.accessExperience.tryAgain)} icon="retry" emphasis="secondary" face="text" type="button"
            state="ready" onclick={() => void refresh()} />{/if}
        </StackLayout>
      {/if}
      <!-- The error sits centred at the reading measure, its text at the start (as .access-feedback did). -->
      {#if current.error}<Inline gap="relaxed" justify="center" overflow="none"><Column gap="relaxed" measure="reading">
        <StackLayout title={say(m.accessExperience.access)}><Text kind="support" live="polite" text={current.error} /></StackLayout>
      </Column></Inline>{/if}
    </Column>
  {/snippet}
</Surface>
