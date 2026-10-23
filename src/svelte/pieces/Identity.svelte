<script lang="ts">
  import { useAccess } from "./access-context.ts";
  import StackLayout from "./StackLayout.svelte";
  import Information from "./Information.svelte";
  import Feedback from "./Feedback.svelte";
  const access = useAccess();
  let state = $derived(access?.snapshot().state);
</script>

{#if state?.kind === "ready"}
  <StackLayout title="Your identity">
    <Information items={[
      {kind:"fact",label:"Display name",value:state.identity.displayName},
      {kind:"fact",label:"Identity name",value:state.identity.login},
      {kind:"fact",label:"Role",value:state.identity.role},
    ]} />
  </StackLayout>
{:else}<Feedback text="Human identity access is not installed in this developer session." />{/if}
