<script lang="ts">
  import * as Avatar from "../../../vendor/components/ui/avatar/index.js";
  import { actionIconNames } from '../../../infra/action-icons.ts';
  import { Icon } from '../../index.ts';
  import type { CatalogProps } from "../../types.d.ts";
  let { face, compact = false }: CatalogProps<"face"> = $props();
  let glyph = $derived(face.kind === "symbol" ? face.text : face.kind === "flag"
    ? Array.from(face.region, letter => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)).join("") : "");
</script>
<Avatar.Root shape="object" class="bank-face size-[var(--face-size,2rem)]" data-piece="face" data-face-kind={face.kind}
  data-compact={compact || undefined} data-tone={face.kind === "status" ? face.severity : "neutral"} aria-hidden="true">
  <Avatar.Fallback>{#if face.kind === 'icon'}<Icon name={actionIconNames[face.icon]} />{:else if face.kind === "status"}<Icon name="circle-alert" />{:else if face.kind === "document"}<Icon name="file-text" />{:else}<span data-face-glyph>{glyph}</span>{/if}</Avatar.Fallback>
</Avatar.Root>
