// One witness of MessageBody per state: a status paragraph and a message dialog's description.
import type { CatalogSpecimen } from "../../types.d.ts";

export const MessageBodySpecimens = [
  { state: "default", props: { content: { kind: "message", text: "Your changes are saved." } } },
  { state: "dialog", props: { content: { kind: "message", text: "This note will be removed from every device." }, messageDialog: true } },
] as const satisfies readonly CatalogSpecimen<"message-body">[];
