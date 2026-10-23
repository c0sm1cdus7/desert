<script lang="ts">
  import { untrack } from "svelte";
  import * as Group from "../vendor/components/ui/input-group/index.js";
  import { formatMaskedValue, readMaskedValue, maskSeparators, type InputMask } from "../../interaction/input-mask.ts";
  import { historyKey, inputEditHistory, inputSnapshot, type InputSnapshot } from "./input-edit-history.ts";
  let { value, mask, identity = "", display = $bindable(""), onvalue, id, placeholder, disabled, required,
    "aria-required": ariaRequired, "aria-invalid": invalid, "aria-label": label, "aria-describedby": describedBy }: {
    value: string; mask: InputMask; identity?: string; display?: string;
    id?: string; placeholder?: string; disabled?: boolean; required?: boolean;
    "aria-required"?: boolean; "aria-invalid"?: boolean; "aria-label"?: string; "aria-describedby"?: string;
    onvalue: (value: string, valid: boolean, complete: boolean) => void;
  } = $props();
  let composing = false, compositionInput = false, allowDisplacedGrouping = false;
  let published: string | undefined;
  let incomingValue: string | undefined;
  let echoes: string[] = [];
  const history = inputEditHistory();
  let pending: { state: InputSnapshot; kind: string } | undefined;
  const context = () => `${identity}/${mask.kind}/${mask.locale}/${mask.scale}`;
  let observed = untrack(context);
  $effect(() => {
    const next = context(), incoming = value;
    untrack(() => {
      const acknowledgement = echoes.indexOf(incoming);
      if (next !== observed || incoming !== incomingValue && incoming !== published && acknowledgement < 0) {
        display = formatMaskedValue(incoming, mask); history.reset(); pending = undefined;
        composing = false; compositionInput = false; allowDisplacedGrouping = false; published = undefined;
        echoes = [];
      } else if (acknowledgement >= 0) echoes.splice(0, acknowledgement + 1);
      observed = next; incomingValue = incoming;
    });
  });
  function position(text: string, offset: number) {
    const { group } = maskSeparators(mask);
    return text.slice(0, offset).split(group).join("").length;
  }
  function caret(text: string, logical: number) {
    if (!logical) return 0;
    for (let index = 1; index <= text.length; index++) if (position(text, index) >= logical) return index;
    return text.length;
  }
  function edit(input: HTMLInputElement, strict: boolean, record = true) {
    const previous = pending ?? { state: { ...inputSnapshot(input), text: display }, kind: "replacement" };
    pending = undefined;
    const raw = input.value, start = position(raw, input.selectionStart ?? raw.length);
    const end = position(raw, input.selectionEnd ?? raw.length), direction = input.selectionDirection ?? "none";
    const result = readMaskedValue(raw, mask, strict);
    if (!result.valid) {
      display = previous.state.text; input.value = display;
      input.setSelectionRange(previous.state.start, previous.state.end, previous.state.direction);
      return;
    }
    display = formatMaskedValue(result.value, mask);
    if (input.value !== display) {
      input.value = display;
      input.setSelectionRange(caret(display, start), caret(display, end), direction);
    }
    if (record) history.record(previous.state, inputSnapshot(input), previous.kind);
    published = result.value;
    if (result.valid && result.complete) echoes.push(result.value);
    onvalue(result.value, result.valid, result.complete);
  }
  function restore(input: HTMLInputElement, direction: "undo" | "redo") {
    if (composing || input.disabled || input.readOnly) return;
    const state = history[direction](); if (!state) return;
    input.value = state.text; input.setSelectionRange(state.start, state.end, state.direction);
    pending = undefined; compositionInput = false; allowDisplacedGrouping = false;
    edit(input, true, false);
  }
  function keydown(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
    if (event.defaultPrevented || composing || event.isComposing) return;
    const direction = historyKey(event);
    if (direction) { event.preventDefault(); restore(event.currentTarget, direction); }
    else if (event.key.length > 1 && !["Backspace", "Delete"].includes(event.key)) history.boundary();
  }
  function before(event: InputEvent & { currentTarget: HTMLInputElement }) {
    if (event.inputType === "historyUndo" || event.inputType === "historyRedo") {
      event.preventDefault(); restore(event.currentTarget, event.inputType === "historyUndo" ? "undo" : "redo"); return;
    }
    if (!composing) pending = { state: inputSnapshot(event.currentTarget), kind: event.inputType };
    const { group } = maskSeparators(mask);
    const insertsGrouping = event.data?.includes(group) ?? false;
    // Editing digits can displace generated separators. Newly supplied grouping
    // must already be valid; stripping it could silently change the amount.
    allowDisplacedGrouping = !insertsGrouping &&
      !["insertFromPaste", "insertFromDrop", "insertReplacementText"].includes(event.inputType);
    const input = event.currentTarget, start = input.selectionStart, end = input.selectionEnd;
    if (composing || event.isComposing || start === null || end === null) return;
    if (event.cancelable && event.inputType.startsWith("insert") && event.data !== null) {
      const next = input.value.slice(0, start) + event.data + input.value.slice(end);
      if (!readMaskedValue(next, mask, !allowDisplacedGrouping).valid) {
        event.preventDefault(); pending = undefined; allowDisplacedGrouping = false; return;
      }
    }
    if (start !== end) return;
    // Deleting beside a generated separator removes the adjacent digit, not
    // a separator that would immediately reappear. Let the native edit run.
    if (event.inputType === "deleteContentBackward" && start > 1 && input.value.slice(start - group.length, start) === group)
      input.setSelectionRange(start - group.length - 1, start);
    if (event.inputType === "deleteContentForward" && input.value.slice(start, start + group.length) === group)
      input.setSelectionRange(start, start + group.length + 1);
  }
</script>
<Group.Input {id} {placeholder} {disabled} {required} aria-required={ariaRequired} aria-invalid={invalid}
  aria-label={label} aria-describedby={describedBy} type="text" inputmode="decimal" value={display} data-input-mask={mask.kind}
  onbeforeinput={before}
  onkeydown={keydown}
  onpointerdown={() => history.boundary()}
  oncompositionstart={event => { composing = true; pending = { state: inputSnapshot(event.currentTarget), kind: "composition" }; }}
  oncompositionend={event => { composing = false; edit(event.currentTarget, true); compositionInput = true; }}
  oninput={event => {
    if (composing || event instanceof InputEvent && event.isComposing) { display = event.currentTarget.value; return; }
    if (compositionInput && event.currentTarget.value === display) { compositionInput = false; pending = undefined; return; }
    compositionInput = false;
    edit(event.currentTarget, !allowDisplacedGrouping); allowDisplacedGrouping = false;
  }}
  onblur={() => history.boundary()} />
