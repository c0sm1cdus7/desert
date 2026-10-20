/** Renderer ownership is canonical metadata, not a second list of semantic IDs. */
export const CatalogGroups = [
  { id: 'foundations', title: 'Foundations', description: 'Shared material, reading, row, field, action and status rules.' },
  { id: 'controls', title: 'Controls', description: 'Writing, selection, dates, money and files. Local specimens do not execute commands.' },
  { id: 'compositions', title: 'Compositions', description: 'Collections, forms, context, review and adaptive surfaces assembled from shared owners.' },
  { id: 'product', title: 'Product examples', description: 'Content and media using the same renderer rules.' },
] as const;
export type DiscoveryGroup = typeof CatalogGroups[number]['id'];
export const CatalogFoundations = [
  { id: 'pane', title: 'Pane + state', sources: ['src/svelte/pieces/pane-material.css'], rule: 'One material and perimeter; semantic states never repaint the pane.' },
  { id: 'stack', title: 'Reading stack', sources: ['src/svelte/pieces/StackLayout.svelte'], rule: 'A transparent titled stack organizes content; reading stays visible.' },
  { id: 'choice', title: 'Choice row', sources: ['src/svelte/pieces/ChoiceItem.svelte', 'src/svelte/pieces/ChoiceList.svelte'], rule: 'One divided anatomy; radio for one, checkbox for many. Hosts own commit semantics.' },
  { id: 'well', title: 'Field well', sources: ['src/svelte/pieces/FieldWell.svelte'], rule: 'A single field boundary with persistent label and explicit feedback.' },
  { id: 'action', title: 'Action', sources: ['src/svelte/pieces/Action.svelte'], rule: 'Stable geometry across ready, unavailable and pending; intent stays explicit.' },
  { id: 'status', title: 'Status', sources: ['src/svelte/pieces/Availability.svelte'], rule: 'Status is readable text plus semantic foreground, never color alone.' },
] as const;
export type FoundationId = typeof CatalogFoundations[number]['id'];

export function catalogInspection(id: string, states: readonly string[], group: DiscoveryGroup,
  owners: readonly FoundationId[], evidence: readonly string[]) {
  const presentation = ['featured', 'item', 'calendar', 'image', 'fallback', 'neutral', 'accent', 'success', 'warning', 'destructive'];
  return {
    group, owners,
    axes: {
      state: states.filter(state => !['one', 'many', ...presentation].includes(state)),
      cardinality: states.filter(state => ['one', 'many'].includes(state)),
      presentation: states.filter(state => presentation.includes(state)),
      environment: ['narrow', 'wide', '200% text', 'light', 'dark', 'contrast', 'reduced transparency', 'reduced motion'],
    },
    fixtures: states.map(state => ({ id: `${id}:${state}`, state,
      owner: id.startsWith('control.') ? 'control-bank' : 'bank' })),
    assertions: owners.map(owner => CatalogFoundations.find(item => item.id === owner)!.rule),
    evidence,
    // Evidence paths identify checks, not a claim that every state/environment
    // combination has passed. Release evidence is recorded by the actual run.
    qualification: 'partial' as const,
    gaps: ['Native Safari/VoiceOver and the complete state × environment matrix are not qualified.'],
  };
}

export function controlInspection(kind: string, states: readonly string[]) {
  const group: DiscoveryGroup = ['tag'].includes(kind) ? 'foundations'
    : ['image', 'avatar'].includes(kind) ? 'product' : kind === 'popover' ? 'compositions' : 'controls';
  const owners: FoundationId[] = kind === 'options' || kind === 'select' ? ['pane', 'choice', 'well']
    : kind === 'tag' ? ['pane', 'status'] : ['image', 'avatar'].includes(kind) ? ['stack'] : ['pane', 'well', 'action'];
  const result = catalogInspection(`control.${kind}`, states, group, owners, ['tests/control-bank.test.ts', 'tests/extended-controls.test.ts']);
  if (kind === 'money' || kind === 'options') result.evidence = [...result.evidence, 'tests/bank-control-states.test.ts'];
  if (kind === 'money') result.gaps.unshift('Invalid lexical drafts are exercised by editing an amount (for example, typing a minus sign), not seeded as invalid canonical values.');
  return result;
}
