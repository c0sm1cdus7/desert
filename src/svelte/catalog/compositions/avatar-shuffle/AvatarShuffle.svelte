<script lang="ts">
  import { m } from "../../../../messages/keys.ts";
  import { say } from "../../../infra/messages.ts";
  import { Avatar } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  // AvatarShuffle is Avatar with the shuffle interaction (the foundation owns the button and its overlay); this folder
  // stays until Batch 3 prunes it.
  let { seed, onchange, disabled = false }: CatalogProps<"avatar-shuffle"> = $props();
</script>
<Avatar size="portrait" interaction="shuffle" source={{ kind: "seed", seed }} shuffleLabel={say(m.avatarShuffle.shuffleAvatar)} {disabled}
  onshuffle={value => onchange?.(value)} />
