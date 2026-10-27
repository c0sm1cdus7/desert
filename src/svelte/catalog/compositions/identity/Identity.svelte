<script lang="ts">
  import { m } from "../../../../messages/keys.ts";
  import { useAccess } from "../../../infra/access-context.ts";
  import { say } from "../../../infra/messages.ts";
  import { Information, StackLayout, Text } from "../../index.ts";
  const access = useAccess();
  let state = $derived(access?.snapshot().state);
</script>

{#if state?.kind === "ready"}
  <StackLayout title={say(m.identity.identity)}>
    <Information items={[
      { kind: "fact", label: say(m.identity.displayName), value: state.identity.displayName },
      { kind: "fact", label: say(m.identity.identityName), value: state.identity.login },
      { kind: "fact", label: say(m.identity.role), value: state.identity.role },
    ]} />
  </StackLayout>
{:else}<Text kind="support" live="polite" text={say(m.identity.notInstalled)} />{/if}
