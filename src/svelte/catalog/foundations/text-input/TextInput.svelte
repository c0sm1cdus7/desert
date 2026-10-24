<script lang="ts">
  // TextInput was renamed Field (design §1.7). The folder stays until Batch 3 deletes it, and its entry draws through
  // Field, so the catalog keeps one implementation of the writing well.
  import { Field } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { primitive, label, value = "", required = false, invalid = false, error, helper, disabled = false,
    identity, mask, maxLength, purpose = "text", onchange, accessory: trailing }: CatalogProps<"text-input"> = $props();
</script>
{#if primitive === "input.multiline"}
  <Field primitive="input.multiline" {label} labelVisibility="visible" {required} {invalid} {disabled} {error} {helper} {identity}
    measure="writing" {value} {maxLength} {onchange} />
{:else if trailing}
  <Field primitive="input.text" {label} labelVisibility="visible" {required} {invalid} {disabled} {error} {helper} {identity}
    measure="writing" {purpose} {value} {mask} clear {onchange}>{#snippet accessory()}{@render trailing()}{/snippet}</Field>
{:else}
  <Field primitive="input.text" {label} labelVisibility="visible" {required} {invalid} {disabled} {error} {helper} {identity}
    measure="writing" {purpose} {value} {mask} clear {onchange} />
{/if}
