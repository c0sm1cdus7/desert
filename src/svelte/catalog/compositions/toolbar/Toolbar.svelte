<script lang="ts">
  import { submitsJourney } from "../../../../interaction/intent.ts";
  import type { ToolbarAction } from "../../../../interaction/toolbar.ts";
  import type { BarCommand } from "../../../infra/bar-command.ts";
  import { Bar } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { toolbar, invoke, submit, presentation = "standard" }: CatalogProps<"toolbar"> = $props();
  // The command that runs the frame's form journey submits that form; every other command invokes its intent.
  const command = (action: ToolbarAction): BarCommand =>
    submit && submitsJourney(action.intent, submit.journey) ? { ...action, submit: submit.form } : action;
</script>

{#if toolbar.edge === "top"}
  <Bar edge="top" purpose="commands" identity={{ title: toolbar.title, subtitle: toolbar.subtitle }}
    identityRole={presentation === "message" ? "message" : "heading"} face={toolbar.face} leading={toolbar.leading}
    trailing={toolbar.trailing ?? []} group={toolbar.actionGroup} primary={toolbar.primary && command(toolbar.primary)}
    availability={toolbar.availability} settingsPlaceholder={false} inert={false} oninvoke={invoke} />
{:else}
  <Bar edge="bottom" purpose={toolbar.navigation === "steps" ? "steps" : "commit"} identityRole="heading" trailing={[]}
    secondary={toolbar.secondary} primary={toolbar.primary && command(toolbar.primary)} settingsPlaceholder={false} inert={false}
    oninvoke={invoke} />
{/if}
