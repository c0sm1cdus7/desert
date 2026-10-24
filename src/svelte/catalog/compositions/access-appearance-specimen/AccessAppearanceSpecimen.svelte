<script lang="ts">
  import { m } from "../../../../messages/keys.ts";
  import { AccessExperience, AppearancePreferences, Avatar, LockScreen, Text, ThemePreview, Wallpaper } from "../../index.ts";
  import { defaultAppearance, type AppearancePreferences as Preferences } from "../../../infra/appearance-preferences.ts";
  import { say } from "../../../infra/messages.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { owner }: CatalogProps<"access-appearance-specimen"> = $props();
  let preferences = $state<Preferences>({ ...defaultAppearance, theme:"dark" });
  let seed = $state("0011223344556677");
  let feedback = $state("");
  const profile = { login:"sample-identity", displayName:"Sample identity", avatarSeed:"0011223344556677" };
</script>

{#if owner === "AppearancePreferences"}<AppearancePreferences value={preferences} onchange={value => preferences = value} />
{:else if owner === "AppearancePreview"}<ThemePreview mode="dark" tint={preferences.tint} wallpaper={preferences.wallpaper} />
{:else if owner === "SeedAvatar"}<Avatar size="portrait" interaction="none" source={{ kind: "seed", seed }}
  label={say(m.accessAppearanceSpecimen.avatar)} />
{:else if owner === "AvatarShuffle"}<Avatar size="portrait" interaction="shuffle" source={{ kind: "seed", seed }}
  shuffleLabel={say(m.accessAppearanceSpecimen.shuffleAvatar)} onshuffle={value => seed = value} />
{:else if owner === "Wallpaper"}<Wallpaper wallpaper={preferences.wallpaper} preview />
{:else if owner === "LockScreen"}<LockScreen {profile} onsubmit={async () => { feedback = say(m.accessAppearanceSpecimen.noAuthentication); }} />
{:else}<AccessExperience productLabel="VOID" {preferences} onappearancechange={value => preferences = value}
  current={{ state:{ kind:"onboarding" }, busy:false, error:null }}
  authenticate={async () => { feedback = say(m.accessAppearanceSpecimen.noIdentity); }} refresh={async () => {}} />{/if}
{#if feedback}<Text kind="support" live="polite" text={feedback} />{/if}
