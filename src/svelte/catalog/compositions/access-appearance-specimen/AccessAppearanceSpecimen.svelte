<script lang="ts">
  import AppearancePreferences from "../appearance-preferences/AppearancePreferences.svelte";
  import AppearancePreview from "../appearance-preview/AppearancePreview.svelte";
  import SeedAvatar from "../../foundations/seed-avatar/SeedAvatar.svelte";
  import AvatarShuffle from "../avatar-shuffle/AvatarShuffle.svelte";
  import Wallpaper from "../../foundations/wallpaper/Wallpaper.svelte";
  import AccessExperience from "../access-experience/AccessExperience.svelte";
  import LockScreen from "../lock-screen/LockScreen.svelte";
  import Feedback from "../../foundations/feedback/Feedback.svelte";
  import { defaultAppearance, type AppearancePreferences as Preferences } from "../../../infra/appearance-preferences.ts";
  let { owner }: { owner: "AppearancePreferences" | "AppearancePreview" | "SeedAvatar" | "AvatarShuffle" | "Wallpaper" | "AccessExperience" | "LockScreen" } = $props();
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
