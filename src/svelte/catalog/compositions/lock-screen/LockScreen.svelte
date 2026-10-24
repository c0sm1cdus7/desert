<script lang="ts">
  import { Check } from "@sinclair/typebox/value";
  import { AccessRequests } from "../../../../identity/contract.ts";
  import { Action, Clock, Column, Form, Heading, SeedAvatar, StackLayout, TextInput } from "../../index.ts";
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
  <Form label="Unlock" {submit}>
    <StackLayout title="Your identity" headingVisibility="accessible">
      {#if !known}<TextInput primitive="input.text" label="Identity name" purpose="username" value={login} disabled={busy} onchange={value => login = value} />{/if}
      <TextInput primitive="input.text" label="Password" purpose="current-password" value={password} disabled={busy} onchange={value => password = value}>
        {#snippet accessory()}<Action label="Unlock" icon="open" face="icon" type="submit" state={busy ? "pending" : valid ? "ready" : "unavailable"} />{/snippet}
      </TextInput>
    </StackLayout>
  </Form>
  {#if known}<Action label="Use another identity" icon="back" state={busy ? "unavailable" : "ready"} onclick={() => { another = true; password = ""; }} />{/if}
</Column>
