import type { viewProgramModel } from "../src/web/client/view-program.ts";
import type { OwnedViewEvent, ViewEventOwner } from "../src/web/client/view-events.ts";

function check(model: ReturnType<typeof viewProgramModel>, owner: ViewEventOwner) {
  const event = { kind: "input.change", name: "title", value: "Writing" } as const;
  model.event({ owner, event });
  // @ts-expect-error A renderer cannot silently adopt whichever editor is current.
  model.event(event);
  // @ts-expect-error Product/view IDs are not mounted runtime identity.
  const stringOwner: OwnedViewEvent = { owner: "notes", event };
  // @ts-expect-error An epoch alone cannot manufacture an instance.
  const inventedOwner: OwnedViewEvent = { owner: { epoch: 1 }, event };
  void [stringOwner, inventedOwner];
}
void check;
