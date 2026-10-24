<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { HumanSurface, ValidateInput } from "../../../../web/types.ts";
  import type { ViewProgram } from "../../../../views/program-schema.ts";
  import { ViewProduct } from "../../index.ts";
  import { accessClient } from "../../../../web/client/access.ts";
  import { provideAccess } from "../../../infra/access-context.ts";
  import { AccessScreen } from "../../index.ts";
  import { browserAccessLock } from "./browser-access-lock.ts";
  import { rememberAccessProfile } from "../../../infra/access-profile.ts";
  let { surface, validateInput, viewProgram }: {
    surface: HumanSurface; validateInput: ValidateInput; viewProgram: ViewProgram;
  } = $props();
  let productLabel = $derived(viewProgram.label);
  const client = untrack(() => accessClient(surface.contractDigest, browserAccessLock()));
  let current = $state.raw(client.snapshot());
  provideAccess({ client, snapshot: () => current });
  onMount(() => {
    const stop = client.subscribe(() => {
      current = client.snapshot();
      if (current.state.kind === "ready") rememberAccessProfile(current.state.identity);
    });
    const invitation = new URLSearchParams(location.hash.slice(1)).get("access");
    history.replaceState(null, "", location.pathname + location.search);
    void client.start(invitation ?? undefined);
    const refresh = () => { if (document.visibilityState === "visible") void client.refresh(); };
    const timer = setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { stop(); client.stop(); clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  });
</script>

{#if current.state.kind === "ready" || current.state.kind === "developer"}
  {#key current.state.kind === "ready" ? current.state.sessionBinding : "developer"}
    <ViewProduct program={viewProgram} {surface} {validateInput} access={{ lock: client.lock }} />
  {/key}
{:else}<AccessScreen {productLabel} {current} {client} />{/if}
