<script lang="ts">
  import { surfaceFrame } from "../../../../interaction/surface-frame.ts";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import { isFormControlEvent } from "../../../../interaction/form-control-event.ts";
  import { ContentFlow, FrameBody, Surface, Toolbar } from "../../index.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { frame, body, invoke, edit = () => {}, presentation = "standard", controlEvent }: CatalogProps<"surface-frame"> = $props();
  const uid = $props.id();
  const formId = `${uid}-form`;
  let checked = $derived.by(() => {
    const value = surfaceFrame(frame);
    // A modal message may consolidate dismissal, never suppress task navigation.
    if (presentation === "message" && value.kind !== "message" && value.kind !== "confirmation") throw new Error("INVALID_MESSAGE_PRESENTATION");
    return value;
  });
  // A commit belongs to the top rail. Only an explicitly multi-step journey
  // owns a bottom navigation rail; confirmations retain their compact choices.
  let steps = $derived(checked.kind === "journey" && checked.navigation === "steps");
  let topCommit = $derived(!steps && (checked.kind === "journey" || checked.kind === "specimen") ? checked.bottom.primary : undefined);
  let topToolbar = $derived(topCommit ? {...checked.top, primary:{...topCommit,
    icon:checked.content.kind === "form" || checked.content.kind === "review" ? "confirm" as const : topCommit.icon}} : checked.top);
  let closing = $derived(steps || checked.kind === "confirmation" || checked.kind === "message");
  let choices = $derived(closing && (checked.bottom.primary !== undefined || (checked.bottom.secondary !== undefined && presentation !== "transient")));
  let label = $derived(checked.kind === "context" ? say(m.surfaceFrame.context) : checked.kind === "journey" ? say(m.surfaceFrame.journey) : undefined);
  // A form frame wraps its bars and content in one form, named by its title; its submit command names that form.
  let form = $derived(checked.content.kind === "form" ? { label: checked.top.title, id: formId } : undefined);
  let submit = $derived(checked.content.kind === "form" ? { journey: checked.content.submit, form: formId } : undefined);
  function submitted() {
    if (checked.content.kind !== "form") return;
    const action = checked.bottom.primary;
    if (action?.state === "ready") invoke(action.intent);
  }
  function dispatch(event: NodeEvent) {
    if (event.kind === "input.change") edit(event.name, event.value);
    else if (isFormControlEvent(event)) controlEvent?.(event);
    else if (event.kind === "surface.invoke") invoke(event.intent);
  }
</script>

<Surface kind="frame" {presentation} {label} {form} searching={false} onsubmit={submitted}>
  {#snippet top()}<Toolbar toolbar={{ edge: "top", ...topToolbar }} {invoke} {presentation} {submit} />{/snippet}
  {#snippet content()}
    {#if body}<ContentFlow resolved={body} onevent={dispatch} host="panel" />
    {:else}<FrameBody content={checked.content} {invoke} {edit} {controlEvent} messageDialog={presentation === "message"} />{/if}
  {/snippet}
  {#snippet bottom()}
    {#if choices}
      <Toolbar toolbar={{ edge: "bottom", ...checked.bottom, ...(steps ? { navigation: "steps" as const } : {}) }} {invoke} {presentation} {submit} />
    {/if}
  {/snippet}
</Surface>
