<script lang="ts">
  import { onMount } from "svelte";
  import AccessExperience from "../access-experience/AccessExperience.svelte";
  import { mountCatalogAppearance } from "../../../infra/catalog-appearance.ts";
  import type { AccessClient } from "../../../../web/client/access.ts";
  import { readAccessProfile, type AccessProfile } from "../../../infra/access-profile.ts";
  let { productLabel, current, client }: { productLabel: string; current: ReturnType<AccessClient["snapshot"]>; client: AccessClient } = $props();
  onMount(mountCatalogAppearance);
  let profile = $state<AccessProfile | null>(null);
  onMount(() => { profile = readAccessProfile(); });
</script>

<AccessExperience {productLabel} {current} {profile} authenticate={client.authenticate} refresh={client.refresh} />
