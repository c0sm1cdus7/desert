// One witness of SummaryWidget: a loaded task collection counted by status, ready to open its destination.
import type { CatalogSpecimen } from "../../types.d.ts";

export const SummaryWidgetSpecimens = [
  { state: "default", props: {
    node: { version: "desert.bank-node/1", kind: "collection", object: "task", fields: ["status"], labels: { "task.status": "Status" },
      loaded: true, disabled: false, selectedId: null, connection: "ready",
      presentation: { kind: "summary-widget", title: "Tasks", description: "Work at a glance", totalLabel: "Tasks", field: "status",
        segments: [{ value: "open", label: "Open" }, { value: "completed", label: "Completed" }] },
      records: [{ id: "first", version: 1, facts: { status: "open" } }, { id: "second", version: 1, facts: { status: "open" } },
        { id: "third", version: 1, facts: { status: "completed" } }] },
    activate: () => {},
  } },
] as const satisfies readonly CatalogSpecimen<"summary-widget">[];
