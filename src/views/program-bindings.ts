import type { HumanSurface } from "../web/types.ts";
import type { ViewJourney, ViewProgram } from "./program-schema.ts";
import type { ObjectPresentation } from "./object-presentation.ts";
import { freezeDeep } from "../json.ts";
import { publicationReferenceIssue, publicationSubjectIssue } from "./publication-semantics.ts";
import { canInitializeInput } from "../interaction/input-initialization.ts";
import { viewInputs } from "./ports.ts";
import { validateWidgetBinding } from './widget-binding.ts';

export type PublishedSubjectAction = Pick<ObjectPresentation, "object" | "view"> & ObjectPresentation["actions"][number];
/** One edge projection for the storyboard and subject toolbar; shared views do not transfer activity ownership. */
export function publishedActionsFor(program: ViewProgram, read: ViewJourney): readonly PublishedSubjectAction[] {
  if (read.kind !== "read") return [];
  return freezeDeep((program.objects ?? []).filter(object => object.view === read.detailView).flatMap(object =>
    object.actions.filter(action => program.journeys.some(journey => journey.id === action.journey &&
      (journey.kind === "update" || journey.kind === "action") && journey.source === read.id))
      .map(action => ({ object: object.object, view: object.view, ...action }))));
}

/** A mutation returns only to its declared, exposed read of the same object. */
export function sourceRead(program: ViewProgram, surface: HumanSurface, journey: ViewJourney) {
  if (journey.kind !== "create" && journey.kind !== "update" && journey.kind !== "action" && journey.kind !== "activity") throw new Error("INVALID_VIEW_SOURCE");
  const mutation = surface.journeys.find(item => item.id === journey.id);
  const source = program.journeys.find(item => item.kind === "read" && item.id === journey.source &&
    surface.journeys.some(read => read.id === item.id && read.kind === "read" &&
      mutation?.kind === "mutation" && read.subject === mutation.object));
  if (!source || source.kind !== "read") throw new Error("INVALID_VIEW_SOURCE");
  return source;
}

export function validateProgramBindings(program: ViewProgram, surface: HumanSurface) {
  for (const journey of program.journeys) {
    if (journey.kind !== "presentation" || !journey.collections) continue;
    const definition = program.views.find(view => view.id === journey.view);
    if (!definition) throw new Error("UNKNOWN_PROGRAM_VIEW");
    const ports = viewInputs(definition);
    const seen = new Set<string>();
    for (const binding of journey.collections) {
      if (seen.has(binding.input) || !ports.some(port => port.kind === "collection" && port.input === binding.input)) throw new Error("INVALID_OVERVIEW_INPUT");
      seen.add(binding.input);
      const read = surface.journeys.find(item => item.id === binding.read);
      if (read?.kind !== "read" || !program.journeys.some(item => item.kind === "read" && item.id === read.id)) throw new Error("INVALID_OVERVIEW_READ");
      if (binding.where && (!read.collection.includes(binding.where.field) ||
        !((read.detailSchema.properties[binding.where.field] as { enum?: readonly unknown[] } | undefined)?.enum?.includes(binding.where.value)))) {
        throw new Error("INVALID_OVERVIEW_FILTER");
      }
      const port = ports.find(port => port.kind === "collection" && port.input === binding.input);
      if(binding.summary&&(port?.kind!=='collection'||port.presentation?.kind!=='summary-widget'))throw new Error('INVALID_WIDGET_BINDING');
      if (port?.kind === "collection" && port.fields?.some(field => field.object !== read.subject || !read.collection.includes(field.field))) throw new Error("INVALID_COLLECTION_FIELD");
      const visible = port?.kind === "collection" ? port.fields?.map(field => field.field) ?? read.collection : read.collection;
      if(port?.kind==='collection'&&port.presentation?.kind==='summary-widget'){
        if(binding.preview||binding.where)throw new Error('INVALID_WIDGET_BINDING');
        validateWidgetBinding(binding.summary,read,visible);
      } else if (port?.kind === "collection" && port.presentation?.kind === "collection-grid") {
        const title = port.presentation.title, preview = binding.preview;
        const mediaRead = preview && surface.journeys.find(item => item.id === preview.read);
        if (title.object !== read.subject || !visible.includes(title.field) || read.detailSchema.properties[title.field]?.type !== "string" ||
          !preview || mediaRead?.kind !== "read" || !program.journeys.some(item => item.kind === "read" && item.id === preview.read) ||
          preview.where.object !== mediaRead.subject || !mediaRead.collection.includes(preview.where.field) ||
          surface.fieldReferences?.[`${preview.where.object}.${preview.where.field}`]?.object !== read.subject ||
          preview.media.object !== mediaRead.subject || !mediaRead.collection.includes(preview.media.field) ||
          surface.fieldKinds?.[`${preview.media.object}.${preview.media.field}`] !== "asset" ||
          (preview.cover && (preview.cover.object !== read.subject || !read.collection.includes(preview.cover.field) ||
            surface.fieldMediaReferences?.[`${preview.cover.object}.${preview.cover.field}`]?.object !== mediaRead.subject))) {
          throw new Error("INVALID_COLLECTION_PREVIEW");
        }
      } else if (port?.kind === "collection" && port.presentation?.kind === "media-grid") {
        if (binding.preview) throw new Error("INVALID_COLLECTION_PREVIEW");
        const image = port.presentation.image;
        if (image.object !== read.subject || !visible.includes(image.field) || surface.fieldKinds?.[`${image.object}.${image.field}`] !== "asset") throw new Error("INVALID_MEDIA_GRID_FIELD");
        for (const reference of [port.presentation.fit, port.presentation.description]) {
          if (reference && (reference.object !== read.subject || !visible.includes(reference.field) || read.detailSchema.properties[reference.field]?.type !== "string")) throw new Error("INVALID_MEDIA_GRID_FIELD");
        }
      } else {
        if(binding.summary)throw new Error('INVALID_WIDGET_BINDING');
        if (binding.preview) throw new Error("INVALID_COLLECTION_PREVIEW");
        if (visible.some(field => surface.fieldKinds?.[`${read.subject}.${field}`] === "asset")) throw new Error("ASSET_CANNOT_BE_COLLECTION_TEXT");
        if (visible.some(field => surface.fieldKinds?.[`${read.subject}.${field}`] === "labels")) throw new Error("LABELS_CANNOT_BE_COLLECTION_TEXT");
      }
    }
  }
  for (const journey of program.journeys) {
    if (journey.kind !== "read") continue;
    const read = surface.journeys.find(item => item.id === journey.id);
    const definition = program.views.find(item => item.id === journey.view)!;
    const detail = program.views.find(item => item.id === journey.detailView)!;
    if (!definition || !detail) throw new Error("UNKNOWN_PROGRAM_VIEW");
    const relatedInputs = new Set<string>();
    for (const binding of journey.related ?? []) {
      const port = viewInputs(detail).find(port => port.kind === "collection" && port.input === binding.input);
      const related = surface.journeys.find(item => item.id === binding.read);
      const reference = binding.where.field;
      if (relatedInputs.has(binding.input) || !port || related?.kind !== "read" || read?.kind !== "read" ||
        !program.journeys.some(item => item.kind === "read" && item.id === related.id) ||
        reference.object !== related.subject || !related.collection.includes(reference.field) ||
        surface.fieldReferences?.[`${reference.object}.${reference.field}`]?.object !== read.subject) {
        throw new Error("INVALID_RELATED_READ");
      }
      relatedInputs.add(binding.input);
      if (port.kind === "collection" && port.fields?.some(field => field.object !== related.subject || !related.collection.includes(field.field))) throw new Error("INVALID_COLLECTION_FIELD");
      const visible = port.kind === "collection" ? port.fields?.map(field => field.field) ?? related.collection : related.collection;
      if (binding.membership) {
        const mutation = surface.journeys.find(item => item.id === binding.membership!.update);
        if (mutation?.kind !== "mutation" || !mutation.subject || mutation.object !== related.subject ||
          mutation.inputFields.length !== 1 || mutation.inputFields[0] !== binding.membership.input ||
          binding.membership.input !== reference.field || !related.fields.includes(reference.field) ||
          mutation.inputSchema.properties[binding.membership.input]?.type !== "array") throw new Error("INVALID_RELATED_MEMBERSHIP");
      }
      if (binding.layout && (binding.layout.object !== read.subject || !read.fields.includes(binding.layout.field) ||
        !((read.detailSchema.properties[binding.layout.field] as {enum?:readonly unknown[]})?.enum?.every(value => value === "grid" || value === "list")))) {
        throw new Error("INVALID_RELATED_LAYOUT");
      }
      if (port.kind === "collection" && port.presentation?.kind === "summary-widget") throw new Error("INVALID_WIDGET_BINDING");
      if (port.kind === "collection" && port.presentation?.kind === "collection-grid") throw new Error("INVALID_COLLECTION_PREVIEW");
      if (port.kind === "collection" && port.presentation?.kind === "media-grid") {
        const { image, fit, description } = port.presentation;
        if (image.object !== related.subject || !visible.includes(image.field) ||
          surface.fieldKinds?.[`${image.object}.${image.field}`] !== "asset" || [fit, description].some(field =>
            field && (field.object !== related.subject || !visible.includes(field.field) ||
              related.detailSchema.properties[field.field]?.type !== "string"))) throw new Error("INVALID_MEDIA_GRID_FIELD");
      } else if (visible.some(field => surface.fieldKinds?.[`${related.subject}.${field}`] === "asset")) {
        throw new Error("ASSET_CANNOT_BE_COLLECTION_TEXT");
      } else if (visible.some(field => surface.fieldKinds?.[`${related.subject}.${field}`] === "labels")) {
        throw new Error("LABELS_CANNOT_BE_COLLECTION_TEXT");
      }
    }
    for (const port of viewInputs(detail)) {
      if (port.kind !== "context" || read?.kind !== "read") continue;
      if (port.fields?.some(field => field.object !== read.subject || !read.fields.includes(field.field))) {
        throw new Error("INVALID_CONTEXT_FIELD");
      }
      if (port.presentation) {
        const visible = port.fields?.map(field => field.field) ?? read.fields;
        const { media, description } = port.presentation;
        if (media.object !== read.subject || !visible.includes(media.field) ||
          surface.fieldKinds?.[`${media.object}.${media.field}`] !== "asset" ||
          (description && (description.object !== read.subject || !visible.includes(description.field) ||
            read.detailSchema.properties[description.field]?.type !== "string"))) throw new Error("INVALID_MEDIA_OBJECT_FIELD");
      }
    }
    for (const port of viewInputs(definition)) {
      if (port.kind !== "collection") continue;
      if (port.fields?.some(field => read?.kind !== "read" || field.object !== read.subject || !read.collection.includes(field.field))) throw new Error("INVALID_COLLECTION_FIELD");
      const visible = port.fields?.map(field => field.field) ?? (read?.kind === "read" ? read.collection : []);
      if (!port.presentation) {
        if (read?.kind === "read" && visible.some(field => surface.fieldKinds?.[`${read.subject}.${field}`] === "asset")) {
          throw new Error("ASSET_CANNOT_BE_COLLECTION_TEXT");
        }
        if (read?.kind === "read" && visible.some(field => surface.fieldKinds?.[`${read.subject}.${field}`] === "labels")) throw new Error("LABELS_CANNOT_BE_COLLECTION_TEXT");
        continue;
      }
      if (port.presentation.kind === "summary-widget") throw new Error("INVALID_WIDGET_BINDING");
      if (port.presentation.kind === "collection-grid") throw new Error("INVALID_COLLECTION_PREVIEW");
      const image = port.presentation.image;
      if (read?.kind !== "read" || image.object !== read.subject || !visible.includes(image.field) ||
        surface.fieldKinds?.[`${image.object}.${image.field}`] !== "asset") throw new Error("INVALID_MEDIA_GRID_FIELD");
      for (const reference of [port.presentation.fit, port.presentation.description]) {
        if (reference && (reference.object !== read.subject || !visible.includes(reference.field) ||
          read.detailSchema.properties[reference.field]?.type !== "string")) throw new Error("INVALID_MEDIA_GRID_FIELD");
      }
    }
  }
  for (const journey of program.journeys) {
    if (journey.kind !== "create" && journey.kind !== "update" && journey.kind !== "action" && journey.kind !== "activity") continue;
    const source = sourceRead(program, surface, journey);
    if (journey.kind === "create" && journey.initializeFrom) {
      const origin = surface.journeys.find(item => item.id === journey.initializeFrom!.source);
      const mutation = surface.journeys.find(item => item.id === journey.id);
      if (origin?.kind !== "read" || mutation?.kind !== "mutation" ||
        !program.journeys.some(item => item.kind === "read" && item.id === origin.id && item.presentation === "main") ||
        !mutation.inputFields.includes(journey.initializeFrom.input) ||
        surface.fieldReferences?.[`${mutation.object}.${journey.initializeFrom.input}`]?.object !== origin.subject) throw new Error("INVALID_CREATION_ORIGIN");
    }
    if (journey.kind !== "update") continue;
    const read = surface.journeys.find(item => item.id === source.id)!;
    const mutation = surface.journeys.find(item => item.id === journey.id)!;
    if (read.kind !== "read" || mutation.kind !== "mutation") throw new Error("INVALID_VIEW_SOURCE");
    if (!mutation.inputFields.length) throw new Error("UNSUPPORTED_VIEW_UPDATE");
    const inputs = new Set(journey.initialize.map(item => item.input));
    if (inputs.size !== journey.initialize.length || inputs.size !== mutation.inputFields.length ||
      journey.initialize.some(item => !mutation.inputFields.includes(item.input) || !read.fields.includes(item.fact))) {
      throw new Error("INVALID_VIEW_INITIALIZATION");
    }
    const fields = read.detailSchema.properties;
    const inputFields = mutation.inputSchema.properties as Record<string, { type?: unknown }>;
    if (journey.initialize.some(item => !canInitializeInput(inputFields[item.input], fields[item.fact]))) throw new Error("INVALID_VIEW_INITIALIZATION");
  }
  const seen = new Set<string>();
  for (const object of program.objects ?? []) {
    const reads = program.journeys.filter(item => item.kind === "read" && item.detailView === object.view);
    if (seen.has(object.object) || !reads.length || publicationReferenceIssue(object.object, object) || reads.some(item => {
      const read = surface.journeys.find(read => read.id === item.id);
      return read?.kind !== "read" || read.subject !== object.object || !read.fields.includes(object.title.field);
    })) throw new Error("INVALID_VIEW_OBJECT_PRESENTATION");
    seen.add(object.object);
    for (const { journey: id } of object.actions) {
      const binding = program.journeys.find(item => item.id === id);
      const canonical = surface.journeys.find(item => item.id === id);
      if ((binding?.kind !== "update" && binding?.kind !== "action") || publicationSubjectIssue(object.object, canonical?.kind === "mutation" ? canonical.subject : undefined) ||
        !reads.some(read => read.id === binding.source)) throw new Error("INVALID_VIEW_OBJECT_PRESENTATION");
    }
  }
  for (const journey of program.journeys.filter(item => item.kind === "update" || item.kind === "action")) {
    if (!program.objects?.some(object => object.actions.some(action => action.journey === journey.id))) {
      throw new Error(journey.kind === "update" ? "UNPUBLISHED_VIEW_UPDATE" : "UNPUBLISHED_VIEW_SUBJECT_ACTION");
    }
  }
}
