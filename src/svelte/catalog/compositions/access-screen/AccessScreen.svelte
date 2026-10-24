<script lang="ts">
  import { onMount } from "svelte";
  import { AccessExperience } from "../../index.ts";
  import { mountCatalogAppearance } from "../../../infra/catalog-appearance.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { readAccessProfile, type AccessProfile } from "../../../infra/access-profile.ts";
  let { productLabel, current, client }: CatalogProps<"access-screen"> = $props();
  onMount(mountCatalogAppearance);
  let profile = $state<AccessProfile | null>(null);
  onMount(() => { profile = readAccessProfile(); });
</script>

<AccessExperience {productLabel} {current} {profile} authenticate={client.authenticate} refresh={client.refresh} />
