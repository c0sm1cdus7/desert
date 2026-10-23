<script lang="ts">
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import FileText from "@lucide/svelte/icons/file-text";
  import type { Face } from "../../interaction/face.ts";
  import * as Avatar from "../vendor/components/ui/avatar/index.js";
  import { actionIcons } from './action-icons.ts';
  let { face, compact = false }: { face: Face; compact?: boolean } = $props();
  let glyph = $derived(face.kind === "symbol" ? face.text : face.kind === "flag"
    ? Array.from(face.region, letter => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)).join("") : "");
  let Icon = $derived(face.kind === 'icon' ? actionIcons[face.icon] : FileText);
</script>
<Avatar.Root shape="object" class="bank-face size-[var(--face-size,2rem)]" data-piece="face" data-face-kind={face.kind}
  data-compact={compact || undefined} data-tone={face.kind === "status" ? face.severity : "neutral"} aria-hidden="true">
  <Avatar.Fallback>{#if face.kind === 'icon'}<Icon />{:else if face.kind === "status"}<CircleAlert />{:else if face.kind === "document"}<FileText />{:else}<span data-face-glyph>{glyph}</span>{/if}</Avatar.Fallback>
</Avatar.Root>
