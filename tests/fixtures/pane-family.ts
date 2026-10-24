/** Independent S1 specimen: real owners, not the approved artifact's adapter CSS. */
export const paneFamilySource = `<script lang="ts">
  import Action from '@desert/svelte/catalog/foundations/action/Action.svelte';
  import TextInput from '@desert/svelte/catalog/foundations/text-input/TextInput.svelte';
  import MoneyControl from '@desert/svelte/catalog/compositions/money-control/MoneyControl.svelte';
  import OptionsControl from '@desert/svelte/catalog/compositions/options-control/OptionsControl.svelte';
  import * as Sidebar from '@desert/svelte/vendor/components/ui/sidebar/index.js';
  import * as Popover from '@desert/svelte/vendor/components/ui/popover/index.js';
  import * as Dialog from '@desert/svelte/vendor/components/ui/dialog/index.js';
  import { Badge } from '@desert/svelte/vendor/components/ui/badge/index.js';
  import { travelKit } from '@desert/../products/landmarks/exercises.ts';
  let state=$state('ready'), text=$state('A week in Japan');
  const amount=travelKit.stacks.find(s=>s.id==='budget').items[0].control;
  const pace=travelKit.stacks.find(s=>s.id==='pace').items[0].control;
  let disabled=$derived(state==='disabled'), invalid=$derived(state==='invalid');
</script>
<div data-test-controls>{#each ['ready','disabled','invalid','pending'] as item}
  <button onclick={()=>state=item}>{item}</button>{/each}</div>
<main style="padding:24px;max-width:720px;display:flex;flex-direction:column;gap:16px">
  <Sidebar.Provider contentMinWidth="0px" style="min-height:0">
    <Sidebar.Root collapsible="none" style="width:100%;height:auto;padding:12px">
      <Sidebar.MenuButton isActive>Travel kit</Sidebar.MenuButton>
    </Sidebar.Root>
  </Sidebar.Provider>
  <TextInput primitive="input.text" label="Trip name" value={text} {disabled} {invalid}
    error={invalid?'Give this trip a name.':undefined} onchange={next=>text=next}/>
  <MoneyControl node={{...amount,disabled}} onevent={()=>{}}/>
  <OptionsControl node={{...pace,disabled}} onevent={()=>{}}/>
  <Action label="Continue" icon="open" emphasis="primary" state={state==='pending'?'pending':disabled?'unavailable':'ready'} face="fit" type="button"/>
  <Action label="Keep editing" icon="review" state={disabled?'unavailable':'ready'} emphasis="secondary" face="fit" type="button"/>
  <Badge variant="secondary">Draft</Badge><Badge variant="success">Ready</Badge>
  <Badge variant="warning">Attention</Badge><Badge variant="destructive">Failed</Badge>
  <Popover.Root><Popover.Trigger>Open anchored</Popover.Trigger>
    <Popover.Content><p>Anchored context</p></Popover.Content></Popover.Root>
  <Dialog.Root><Dialog.Trigger>Open dialog</Dialog.Trigger>
    <Dialog.Content><Dialog.Title>Review</Dialog.Title><Dialog.Description>Keep context.</Dialog.Description></Dialog.Content></Dialog.Root>
</main>`;
