import type { HumanSurface } from "../types.ts";
import { assetInputMedia, imageInputControl, type DraftFileHost } from "../../interaction/image-input.ts";
import type { ControlEvent } from "../../interaction/control-nodes.ts";
import type { ViewJourney } from "../../views/program-schema.ts";

export function fileEntry(surface: HumanSurface, files: DraftFileHost | undefined) {
  let epoch = 0;
  return {
    cancel() { epoch++; },
    async select(journey: Extract<ViewJourney, { kind: "create" }>,
      begin: (selection: Extract<ControlEvent, { kind: "files.choose" }>) => boolean) {
      const input = journey.startWith?.input;
      const mutation = surface.journeys.find(item => item.id === journey.id);
      if (!input || mutation?.kind !== "mutation" || !files?.pick) throw new Error("FILE_PICKER_UNAVAILABLE");
      const current = ++epoch;
      const node = imageInputControl(input, surface.language.fields[`${mutation.object}.${input}`]!, [], false,
        assetInputMedia(mutation.inputSchema.properties[input]));
      const selection = await files.pick(node);
      if (!selection) return;
      if (current !== epoch || !begin(selection)) for (const file of selection.files) files.release(file.id);
    },
  };
}
