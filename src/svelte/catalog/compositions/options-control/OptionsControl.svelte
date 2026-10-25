<script lang="ts">
  import { Choice } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { permitsOptionsSelection, optionsInputRequired } from "../../../../interaction/extended-controls.ts";
  import { currentStackTitle } from "../../../infra/stack-context.ts";
  let { node, onevent }: CatalogProps<"options-control"> = $props();
  // A stack titled like this control already shows its label; the legend then stays for assistive technology only.
  const stackTitle = currentStackTitle();
  const change = (selected: readonly string[]) => {
    if (permitsOptionsSelection(node, selected)) onevent?.({ kind: "options.change", control: node.id, selected });
  };
  const nextSelection = (value: string) => node.maxSelected === 1 ? [value] :
    node.selected.includes(value) ? node.selected.filter(item => item !== value) : [...node.selected, value];
  /** An option is unavailable when the node says so or when choosing it would break the selection's bounds. */
  const disabled = (value: string, unavailable: boolean) => unavailable || !permitsOptionsSelection(node, nextSelection(value));
</script>
<Choice presentation="rows" cardinality={node.maxSelected === 1 ? "one" : "many"} label={node.label}
  labelVisibility={stackTitle() === node.label ? "accessible" : "visible"} selected={node.selected} disabled={node.disabled}
  required={optionsInputRequired(node)} onchange={change}
  options={node.options.map(option => ({ value: option.value, label: option.label, disabled: disabled(option.value, option.disabled),
    ...option.description ? { description: option.description } : {} }))} />
