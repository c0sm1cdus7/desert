<script lang="ts">
  import { Check } from "@sinclair/typebox/value";
  import { AccessRequests } from "../../../../identity/contract.ts";
  import { Action, Clock, Column, Field, Form, Heading, SeedAvatar, StackLayout } from "../../index.ts";
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
  {#if known}<SeedAvatar seed={known.avatarSeed} label={`${known.displayName}'s avatar`} />{/if}
  <Heading kind="page" text={known ? known.displayName : "Unlock"} />
  <Form label="Unlock" fill={false} {submit}>
    <StackLayout title="Your identity" headingVisibility="accessible">
      {#if !known}<Field primitive="input.text" label="Identity name" labelVisibility="visible" required={false} invalid={false} disabled={busy}
        measure="writing" purpose="username" value={login} clear onchange={value => login = value} />{/if}
      <Field primitive="input.text" label="Password" labelVisibility="visible" required={false} invalid={false} disabled={busy}
        measure="writing" purpose="current-password" value={password} clear onchange={value => password = value}>
        {#snippet accessory()}<Action label="Unlock" icon="open" emphasis="secondary" face="icon" type="submit" state={busy ? "pending" : valid ? "ready" : "unavailable"} />{/snippet}
      </Field>
    </StackLayout>
  </Form>
  {#if known}<Action label="Use another identity" icon="back" emphasis="secondary" face="text" type="button" state={busy ? "unavailable" : "ready"}
    onclick={() => { another = true; password = ""; }} />{/if}
</Column>
