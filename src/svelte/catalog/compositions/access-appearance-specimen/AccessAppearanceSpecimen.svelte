<script lang="ts">
  import { AppearancePreferences } from "../../index.ts";
  import { AppearancePreview } from "../../index.ts";
  import { SeedAvatar } from "../../index.ts";
  import { AvatarShuffle } from "../../index.ts";
  import { Wallpaper } from "../../index.ts";
  import { AccessExperience } from "../../index.ts";
  import { LockScreen } from "../../index.ts";
  import { Feedback } from "../../index.ts";
  import { defaultAppearance, type AppearancePreferences as Preferences } from "../../../infra/appearance-preferences.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { owner }: CatalogProps<"access-appearance-specimen"> = $props();
  let preferences = $state<Preferences>({ ...defaultAppearance, theme:"dark" });
  let seed = $state("0011223344556677");
  let feedback = $state("");
  const profile = { login:"sample-identity", displayName:"Sample identity", avatarSeed:"0011223344556677" };
</script>

{#if owner === "AppearancePreferences"}<AppearancePreferences value={preferences} onchange={value => preferences = value} />
{:else if owner === "AppearancePreview"}<AppearancePreview mode="dark" tint={preferences.tint} wallpaper={preferences.wallpaper} />
{:else if owner === "SeedAvatar"}<SeedAvatar {seed} />
{:else if owner === "AvatarShuffle"}<AvatarShuffle {seed} onchange={value => seed = value} />
{:else if owner === "Wallpaper"}<Wallpaper wallpaper={preferences.wallpaper} preview />
{:else if owner === "LockScreen"}<LockScreen {profile} onsubmit={async () => { feedback = "Example only. No authentication request was sent."; }} />
{:else}<AccessExperience productLabel="VOID" {preferences} onappearancechange={value => preferences = value}
  current={{ state:{ kind:"onboarding" }, busy:false, error:null }}
  authenticate={async () => { feedback = "Example only. No identity was created."; }} refresh={async () => {}} />{/if}
{#if feedback}<Feedback text={feedback} />{/if}
