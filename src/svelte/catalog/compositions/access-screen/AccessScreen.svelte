<script lang="ts">
  import { onMount } from "svelte";
  import { AccessExperience } from "../../index.ts";
  import { AppearanceRoot } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { readAccessProfile, type AccessProfile } from "../../../infra/access-profile.ts";
  let { productLabel, current, client }: CatalogProps<"access-screen"> = $props();
  let profile = $state<AccessProfile | null>(null);
  onMount(() => { profile = readAccessProfile(); });
</script>

<AppearanceRoot />
<AccessExperience {productLabel} {current} {profile} authenticate={client.authenticate} refresh={client.refresh} />
