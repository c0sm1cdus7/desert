// The cases lane C's parity test renders twice, with the frozen compositions (compositions-c-before.ts) and with
// today's: every composition of the content, facts and collections lane in each of its states.
const signal = (n: number) => ({ version: "desert.attention/1", recipient: "identity", reason: "activity.resume", resolution: "producer",
  source: { kind: "activity", id: `10000000-0000-4000-8000-00000000001${n}`, revision: 1, journey: "edit" },
  target: { kind: "object", object: "task", id: "10000000-0000-4000-8000-000000000001" } });
const collection = { version: "desert.bank-node/1", kind: "collection", object: "note", fields: ["title", "status", "words"],
  labels: { "note.title": "Title", "note.status": "Status", "note.words": "Words" }, loaded: true, disabled: false, selectedId: "2",
  createLabel: "New note", attention: { "1": [signal(1)] }, valueLabels: { status: { draft: "Draft" } },
  records: [{ id: "1", version: 1, facts: { title: "iPhone ideas", status: "draft", words: 120 } },
    { id: "2", version: 1, facts: { title: "A note whose title is long enough to wrap onto a second line of its row", status: "draft", words: 3 } },
    { id: "3", version: 1, facts: { title: "", status: "draft" } }] };
const widget = { version: "desert.bank-node/1", kind: "collection", object: "task", fields: ["status"], labels: { "task.status": "Status" },
  loaded: true, disabled: false, selectedId: null, connection: "ready",
  presentation: { kind: "summary-widget", title: "Tasks", description: "Your work at a glance.", totalLabel: "Tasks", field: "status",
    segments: [{ value: "open", label: "Open" }, { value: "completed", label: "Completed" }] },
  records: [{ id: "a", version: 1, facts: { status: "open" } }, { id: "b", version: 1, facts: { status: "open" } },
    { id: "c", version: 1, facts: { status: "completed" } }] };
const attention = { loaded: true, error: null, objectSignals: {}, items: [
  { id: "draft", journey: "note", title: "Finish your note", description: "Continue where you left off.", available: true, signals: [signal(1)] },
  { id: "old", journey: "note", title: "Saved activity", description: "This activity needs a compatible version.", available: false, signals: [signal(2)] }] };
const facts = { body: "First paragraph.\n\nSecond paragraph, long enough to wrap at the reading measure of the context panel.",
  summary: "A short summary.", city: "Buenos Aires", phone: null, tags: ["Design", "Research"] };
const labels = { "task.body": "body", "task.summary": "summary", "task.city": "city", "task.phone": "phone", "task.tags": "tags" };
const selector = { field: "status", label: "Status", value: "open", disabled: false, options: [
  { value: "open", label: "Open", journey: "reopen", available: true }, { value: "done", label: "Done", journey: "complete", available: true }] };
const json = (value: unknown) => JSON.stringify(value);

export const compositionCases = `<script lang="ts">
  import Information from "@desert/svelte/catalog/compositions/information/Information.svelte";
  import TextContent from "@desert/svelte/catalog/compositions/text-content/TextContent.svelte";
  import FactGroup from "@desert/svelte/catalog/compositions/fact-group/FactGroup.svelte";
  import ContextPanel from "@desert/svelte/catalog/compositions/context-panel/ContextPanel.svelte";
  import ContextProperties from "@desert/svelte/catalog/compositions/context-properties/ContextProperties.svelte";
  import ReadingContent from "@desert/svelte/catalog/compositions/reading-content/ReadingContent.svelte";
  import ViewDestinationLink from "@desert/svelte/catalog/compositions/view-destination-link/ViewDestinationLink.svelte";
  import Collection from "@desert/svelte/catalog/compositions/collection/Collection.svelte";
  import CollectionState from "@desert/svelte/catalog/compositions/collection-state/CollectionState.svelte";
  import AttentionList from "@desert/svelte/catalog/compositions/attention-list/AttentionList.svelte";
  import AttentionStatus from "@desert/svelte/catalog/compositions/attention-status/AttentionStatus.svelte";
  import SummaryWidget from "@desert/svelte/catalog/compositions/summary-widget/SummaryWidget.svelte";
  const facts = ${json(facts)}, labels = ${json(labels)}, collection = ${json(collection)}, widget = ${json(widget)};
  const attention = ${json(attention)}, selector = ${json(selector)};
  const actions = [{ id: "archive", label: "Archive", available: true, invoke: () => {} }, { id: "share", label: "Share", available: false, invoke: () => {} }];
</script>
<main style="display:grid;gap:24px;padding:16px;width:640px">
  <div data-case="information"><Information items={[{ kind: "text", text: "A reading paragraph before the facts." },
    { kind: "fact", label: "city", value: "Buenos Aires" }, { kind: "fact", label: "phone", value: null }, { kind: "text", text: "A closing paragraph." }]} /></div>
  <div data-case="text-content"><TextContent text="One paragraph of a view's text item." /></div>
  <div data-case="fact-group"><FactGroup object="task" fields={["city", "phone", "tags"]} {facts} {labels} /></div>
  <div data-case="fact-group-empty"><FactGroup object="task" fields={[]} {facts} {labels} /></div>
  <div data-case="context-properties"><ContextProperties object="task" fields={["city", "tags"]} {facts} {labels} selectors={[selector]} onselect={() => {}} /></div>
  <div data-case="reading-content"><ReadingContent object="task" fields={["body", "summary"]} {facts} {labels} /></div>
  <div data-case="context-panel"><ContextPanel object="task" fields={["body", "city", "tags"]} {facts} {labels} multiline={["body"]}
    actions={[]} selectors={[selector]} onselect={() => {}} /></div>
  <div data-case="context-panel-full"><ContextPanel object="task" fields={["body", "city", "tags"]} {facts} {labels} multiline={["body"]}
    attention={[${json(signal(1))}, ${json(signal(2))}]} {actions} selectors={[selector]} onselect={() => {}} /></div>
  <div data-case="context-panel-actions"><ContextPanel object="task" fields={[]} {facts} {labels} {actions} /></div>
  <div data-case="destination"><ViewDestinationLink view="home" output="notes" label="Notes" icon="catalog" available /></div>
  <div data-case="destination-unavailable"><ViewDestinationLink view="home" output="trash" label="Trash" available={false}
    reason="Controller unavailable. Reconnect to open it." /></div>
  <div data-case="collection"><Collection node={collection} select={() => {}} /></div>
  <div data-case="collection-disabled"><Collection node={{ ...collection, disabled: true, attention: {} }} select={() => {}} /></div>
  <div data-case="collection-empty"><Collection node={{ ...collection, records: [] }} select={() => {}} /></div>
  <div data-case="state-loading"><CollectionState loaded={false} /></div>
  <div data-case="state-empty"><CollectionState loaded createLabel="New note" /></div>
  <div data-case="state-bare"><CollectionState loaded /></div>
  <div data-case="state-offline"><CollectionState loaded={false} connection="offline" /></div>
  <div data-case="attention-list"><AttentionList state={attention} resume={() => {}} /></div>
  <div data-case="attention-error"><AttentionList state={{ ...attention, items: [], error: "The attention list could not be refreshed." }} resume={() => {}} /></div>
  <div data-case="attention-empty"><AttentionList state={{ ...attention, items: [] }} resume={() => {}} /></div>
  <div data-case="attention-loading"><AttentionList state={{ ...attention, loaded: false }} resume={() => {}} /></div>
  <div data-case="attention-one"><AttentionStatus signals={[${json(signal(1))}]} /></div>
  <div data-case="attention-many"><AttentionStatus signals={[${json(signal(1))}, ${json(signal(2))}]} /></div>
  <div data-case="summary"><SummaryWidget node={widget} activate={() => {}} /></div>
  <div data-case="summary-loading"><SummaryWidget node={{ ...widget, loaded: false, records: [] }} activate={() => {}} /></div>
  <div data-case="summary-reconnect"><SummaryWidget node={{ ...widget, loaded: false, records: [], connection: "offline" }} activate={() => {}} /></div>
  <div data-case="summary-truncated"><SummaryWidget node={{ ...widget, connection: "offline", presentation: { ...widget.presentation, truncated: true } }}
    activate={() => {}} /></div>
</main>`;

export const compositionCaseNames = ["information", "text-content", "fact-group", "fact-group-empty", "context-properties", "reading-content",
  "context-panel", "context-panel-full", "context-panel-actions", "destination", "destination-unavailable", "collection", "collection-disabled", "collection-empty",
  "state-loading", "state-empty", "state-bare", "state-offline", "attention-list", "attention-error", "attention-empty", "attention-loading",
  "attention-one", "attention-many", "summary", "summary-loading", "summary-reconnect", "summary-truncated"] as const;
