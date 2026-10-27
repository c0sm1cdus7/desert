import type { HumanSurface } from "../types.ts";
import type { HumanStore } from "./state.ts";
import { applyControlEvent, type ControlEvent } from "../../interaction/control-nodes.ts";
import { imageInputControl, assetInputMedia, isImageFileSelection, type DraftFileHost } from "../../interaction/image-input.ts";
import { labelsInputControl, type LabelsInputEvent } from "../../interaction/labels-control.ts";
import { deriveForm } from "../../interaction/form.ts";

export function modelInputs(surface: HumanSurface, store: HumanStore, files?: DraftFileHost) {
  function mutation() {
    const current = store.get();
    const journey = surface.journeys.find(item => item.id === (current.editing?.journeyId ?? current.creationJourneyId));
    return journey?.kind === "mutation" && ["create", "edit"].includes(current.view) ? journey : undefined;
  }
  return {
    /** Only the admitted creation-origin interpreter calls this, with a currently read subject. */
    initializeReference(field: string, subject: string) {
      const current = store.get(), journey = mutation();
      if (current.view !== "create" || current.busy || current.uncertain || !journey?.inputFields.includes(field) ||
        !surface.fieldReferences?.[`${journey.object}.${field}`] || current.touchedFields.includes(field)) return;
      store.update({ draft: { ...current.draft, [field]: [subject] }, draftRevision: current.draftRevision + 1 });
    },
    edit(field: string, value: string) {
      const current = store.get(), journey = mutation();
      if (!journey?.inputFields.includes(field) || ["file", "labels"].includes(surface.fieldKinds?.[`${journey.object}.${field}`] ?? "")) return;
      store.update({ draft: { ...current.draft, [field]: value },
        draftRevision: current.draftRevision + (current.draft[field] === value ? 0 : 1),
        touchedFields: current.touchedFields.includes(field) ? current.touchedFields : [...current.touchedFields, field] });
    },
    editFiles(event: Extract<ControlEvent, { kind: "files.choose" | "files.remove" }>) {
      const current = store.get(), journey = mutation(), field = event.control;
      if (current.busy || current.uncertain || !journey?.inputFields.includes(field)
        || surface.fieldKinds?.[`${journey.object}.${field}`] !== "file") return;
      const before = current.draft[field], selected = isImageFileSelection(before) ? [before.file] : [];
      const node = imageInputControl(field, surface.language.fields[`${journey.object}.${field}`]!, selected,false,assetInputMedia(journey.inputSchema.properties[field]));
      const changed = applyControlEvent(node, event).node;
      if (changed.kind !== "files") throw new Error("INVALID_IMAGE_SELECTION");
      const file = changed.files[0];
      if (file) {
        const handle = files?.resolve(file.id);
        if (!handle || handle.name !== file.name || handle.size !== file.size || handle.type.toLowerCase() !== file.mediaType
          || handle.lastModified !== file.lastModified) throw new Error("IMAGE_FILE_HANDLE_REQUIRED");
      }
      if (isImageFileSelection(before) && before.file.id !== file?.id) files?.release(before.file.id);
      store.update({ draft: { ...current.draft, [field]: file ? { kind: "image-file", file } : "" },
        draftRevision: current.draftRevision + 1,
        touchedFields: current.touchedFields.includes(field) ? current.touchedFields : [...current.touchedFields, field] });
    },
    editLabels(event: LabelsInputEvent) {
      const current = store.get(), journey = mutation(), field = event.control;
      if (!journey?.inputFields.includes(field)
        || surface.fieldKinds?.[`${journey.object}.${field}`] !== "labels") return;
      // Plain labels retain newer local writing while an earlier revision is accepted.
      // Canonical reference controls additionally share the companion-operation lock.
      if (current.uncertain || current.busy && (surface.fieldReferences?.[`${journey.object}.${field}`]
        || surface.fieldMediaReferences?.[`${journey.object}.${field}`])) return;
      if (surface.fieldReferences?.[`${journey.object}.${field}`]) {
        const options=current.references?.[`${journey.object}.${field}`]?.options ?? [];
        if (event.values.some(value => !options.some(option => option.value === value))) return;
      }
      if(surface.fieldMediaReferences?.[`${journey.object}.${field}`]){
        const options=current.mediaReferences?.[`${journey.object}.${field}`]?.options ?? [];
        const maximum=journey.inputSchema.properties[field]?.maxItems;
        if(event.values.some(value=>!options.some(option=>option.value===value))||typeof maximum==='number'&&event.values.length>maximum)return;
      }
      const formField = deriveForm(journey, surface.fieldRepresentations).find(item => item.name === field);
      if (formField?.primitive !== "control.labels") throw new Error("LABELS_INPUT_REQUIRED");
      const before = current.draft[field], values = Array.isArray(before) ? before : [];
      const node = labelsInputControl(field, surface.language.fields[`${journey.object}.${field}`]!, values, formField.limits);
      const changed = applyControlEvent(node, event).node;
      if (changed.kind !== "labels") throw new Error("LABELS_INPUT_REQUIRED");
      store.update({ draft: { ...current.draft, [field]: changed.values },
        draftRevision: current.draftRevision + (values.length === changed.values.length && values.every((value, index) => value === changed.values[index]) ? 0 : 1),
        touchedFields: current.touchedFields.includes(field) ? current.touchedFields : [...current.touchedFields, field] });
    },
  };
}
