<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { CatalogProps } from "../../types.d.ts";
  import { AccessScreen, ViewProduct } from "../../index.ts";
  import { accessClient } from "../../../../web/client/access.ts";
  import { mountAccessSession } from "../../../../web/client/browser-session.ts";
  import { provideAccess } from "../../../infra/access-context.ts";
  import { browserAccessLock } from "./browser-access-lock.ts";
  import { rememberAccessProfile } from "../../../infra/access-profile.ts";
  let { surface, validateInput, viewProgram }: CatalogProps<"access-gate"> = $props();
  let productLabel = $derived(viewProgram.label);
  const client = untrack(() => accessClient(surface.contractDigest, browserAccessLock()));
  let current = $state.raw(client.snapshot());
  provideAccess({ client, snapshot: () => current });
  // The session module owns the launch invitation and the refresh while the page is in view (DESIGN §8 Q3).
  onMount(() => mountAccessSession(client, () => {
    current = client.snapshot();
    if (current.state.kind === "ready") rememberAccessProfile(current.state.identity);
  }));
</script>

{#if current.state.kind === "ready" || current.state.kind === "developer"}
  {#key current.state.kind === "ready" ? current.state.sessionBinding : "developer"}
    <ViewProduct program={viewProgram} {surface} {validateInput} access={{ lock: client.lock }} />
  {/key}
{:else}<AccessScreen {productLabel} {current} {client} />{/if}
