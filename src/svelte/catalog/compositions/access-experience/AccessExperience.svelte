<script lang="ts">
  import type { AccessClient } from "../../../../web/client/access.ts";
  import { AccessForm } from "../../index.ts";
  import { LockScreen } from "../../index.ts";
  import { Wallpaper } from "../../index.ts";
  import { Feedback } from "../../index.ts";
  import { StackLayout } from "../../index.ts";
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import { appearance } from "../../../infra/appearance-state.ts";
  import type { AccessProfile } from "../../../infra/access-profile.ts";
  import type { AppearancePreferences } from "../../../infra/appearance-preferences.ts";
  let { productLabel, current, authenticate, refresh, profile = null, preferences, onappearancechange }: {
    productLabel: string; current: ReturnType<AccessClient["snapshot"]>;
    profile?: AccessProfile | null; preferences?: AppearancePreferences | undefined;
    onappearancechange?: ((value: AppearancePreferences) => void) | undefined;
    authenticate: AccessClient["authenticate"]; refresh: AccessClient["refresh"];
  } = $props();
</script>
<div class="access-experience" data-access-experience>
  <div class="access-wallpaper"><Wallpaper wallpaper={(preferences ?? $appearance).wallpaper} /></div>
  <header class="access-brand">{productLabel}</header>
  <main class="access-content">
    {#if current.state.kind === "onboarding"}
      <AccessForm mode="initialize" {productLabel} {preferences} {onappearancechange} busy={current.busy} onsubmit={input => authenticate("initialize", input)} />
    {:else if current.state.kind === "locked"}
      <LockScreen {profile} busy={current.busy} onsubmit={input => authenticate("signIn", input)} />
    {:else}
      <StackLayout title="Access"><Feedback text={current.state.kind === "checking" ? "Connecting…" : "Access is unavailable."} />
        {#if current.state.kind === "unavailable"}<Button variant="secondary" onclick={() => refresh()}>Try again</Button>{/if}
      </StackLayout>
    {/if}
    {#if current.error}<div class="access-feedback"><StackLayout title="Access"><Feedback text={current.error} /></StackLayout></div>{/if}
  </main>
</div>
<style>
  .access-experience { position:relative; isolation:isolate; min-height:100dvh; width:100%; min-width:0; }
  .access-wallpaper { position:absolute; inset:0; z-index:-1; }
  .access-brand { padding:clamp(1rem,3vw,2rem); font-size:1.4rem; font-weight:650; letter-spacing:-.02em; }
  .access-content { min-height:calc(100dvh - 5rem); padding:1.5rem max(1rem,env(safe-area-inset-right)) max(2rem,env(safe-area-inset-bottom)) max(1rem,env(safe-area-inset-left)); display:flex; flex-direction:column; justify-content:center; gap:1.5rem; }
  .access-feedback { width:min(100%,34rem); margin-inline:auto; }
  @media (max-width:480px) { .access-content { justify-content:flex-start; padding-top:1rem; } }
</style>
