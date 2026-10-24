<script lang="ts">
  import { Check } from "@sinclair/typebox/value";
  import { AccessRequests } from "../../../../identity/contract.ts";
  import { m } from "../../../../messages/keys.ts";
  import { say } from "../../../infra/messages.ts";
  import { Action, Avatar, Clock, Column, Field, Form, Heading, StackLayout } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { profile = null, busy = false, onsubmit }: CatalogProps<"lock-screen"> = $props();
  let another = $state(false), login = $state(""), password = $state("");
  let known = $derived(profile && !another ? profile : null);
  let input = $derived({ login: known ? known.login : login, password });
  let valid = $derived(Check(AccessRequests.signIn, input));
  async function submit() {
    if (!valid || busy) return;
    const submitted = input; password = ""; await onsubmit(submitted);
  }
</script>
<Column gap="regular" measure="narrow" align="center">
  <Clock />
  {#if known}<Avatar size="portrait" interaction="none" source={{ kind: "seed", seed: known.avatarSeed }}
    label={say(m.lockScreen.avatar, { name: known.displayName })} />{/if}
  <Heading kind="display" text={known ? known.displayName : say(m.lockScreen.unlock)} />
  <Form label={say(m.lockScreen.unlock)} fill={false} {submit}>
    <StackLayout title={say(m.lockScreen.identity)} headingVisibility="accessible">
      {#if !known}<Field primitive="input.text" label={say(m.lockScreen.identityName)} labelVisibility="visible" required={false} invalid={false}
        disabled={busy} measure="writing" purpose="username" value={login} clear onchange={value => login = value} />{/if}
      <Field primitive="input.text" label={say(m.lockScreen.password)} labelVisibility="visible" required={false} invalid={false} disabled={busy}
        measure="writing" purpose="current-password" value={password} clear onchange={value => password = value}>
        {#snippet accessory()}<Action label={say(m.lockScreen.unlock)} icon="open" emphasis="secondary" face="icon" type="submit"
          state={busy ? "pending" : valid ? "ready" : "unavailable"} />{/snippet}
      </Field>
    </StackLayout>
  </Form>
  {#if known}<Action label={say(m.lockScreen.useAnotherIdentity)} icon="back" emphasis="secondary" face="text" type="button"
    state={busy ? "unavailable" : "ready"} onclick={() => { another = true; password = ""; }} />{/if}
</Column>
