import { composeProduct, defineModule, factReference, humanExposure, publishObject } from "../../src/index.ts";
import { Note } from "../../products/notebook/note.ts";
import { ArchiveNote, CreateNote, ReadNote } from "../../products/notebook/journeys.ts";
import { authoredNotebookSource, notePublication } from "./authored-notebook.ts";

const exposure = { id: "human", journeys: [CreateNote, ReadNote, ArchiveNote], locale: "en" };
const authored = humanExposure(exposure);
const source = authoredNotebookSource();
composeProduct(source);
publishObject(Note, notePublication);
const inputs = { "note.body": "input.multiline" } as const;
const fieldRepresentations = { "note.body": "paragraphs" } as const;
const commit = { "create-note": "submit", "archive-note": "review" } as const;
const language = { locale: "en", fields: {}, journeys: {} };

// @ts-expect-error Field representations belong to published objects, not surface literals.
humanExposure({ ...exposure, inputs });
// @ts-expect-error Semantic representations are projected from publication, not authored on an exposure.
humanExposure({ ...exposure, fieldRepresentations });
// @ts-expect-error Review requirements belong to the executing journey, not surface literals.
humanExposure({ ...exposure, commit });
// @ts-expect-error Labels belong to published facts and operations, not a surface map.
humanExposure({ ...exposure, language });
const withInputs = { ...exposure, inputs };
const withCommit = { ...exposure, commit };
const withLanguage = { ...exposure, language };
// @ts-expect-error A variable cannot reopen field representation ownership.
humanExposure(withInputs);
// @ts-expect-error A variable cannot reopen human review ownership.
humanExposure(withCommit);
// @ts-expect-error A variable cannot reopen label ownership.
humanExposure(withLanguage);
const withUndefinedInputs = { ...exposure, inputs: undefined };
// @ts-expect-error Presence of a forbidden property is rejected even when undefined.
humanExposure(withUndefinedInputs);
const withUndefinedRepresentations = { ...exposure, fieldRepresentations: undefined };
// @ts-expect-error Presence of a forbidden representation property is rejected even when undefined.
humanExposure(withUndefinedRepresentations);
const canonicalInputs = { ...source, exposures: [{ ...authored, inputs }] };
const canonicalCommit = { ...source, exposures: [{ ...authored, commit }] };
const canonicalLanguage = { ...source, exposures: [{ ...authored, language }] };
// @ts-expect-error Composition cannot accept input maps hidden in a surface variable.
composeProduct(canonicalInputs);
const canonicalRepresentations = { ...source, exposures: [{ ...authored, fieldRepresentations }] };
// @ts-expect-error Composition cannot accept representation maps hidden in a surface variable.
composeProduct(canonicalRepresentations);
// @ts-expect-error Composition cannot accept review maps hidden in a surface variable.
composeProduct(canonicalCommit);
// @ts-expect-error Composition cannot accept label maps hidden in a surface variable.
composeProduct(canonicalLanguage);
// @ts-expect-error Paragraph representation is valid only for text facts.
publishObject(Note, { ...notePublication, fields: [{ fact: factReference(Note, "state"), label: "State", representation: "paragraphs" }] });
// @ts-expect-error Field references must point to this object's actual facts.
publishObject(Note, { ...notePublication, fields: [{ fact: { object: Note.id, field: "imagined" }, label: "Title", representation: "text" }] });
// @ts-expect-error A matching field name cannot refer to a different object.
publishObject(Note, { ...notePublication, fields: [{ fact: { object: "other", field: "title" }, label: "Title", representation: "text" }] });
// @ts-expect-error Ownership identity is not a human-editable presentation field.
publishObject(Note, { ...notePublication, fields: [{ fact: factReference(Note, "owner"), label: "Owner", representation: "text" }] });
// @ts-expect-error Renderer primitive identifiers are not semantic field representations.
publishObject(Note, { ...notePublication, fields: [{ fact: factReference(Note, "body"), label: "Content", representation: "input.multiline" }] });
// @ts-expect-error Human review requirements are not renderer commit instructions.
defineModule({ id: "invalid", journeys: [{ execution: CreateNote, label: "Create note", humanReview: "submit" }] });
// @ts-expect-error A read is not a mutation that can require human review.
defineModule({ id: "invalid", journeys: [{ execution: ReadNote, label: "Read notes", humanReview: "required" }] });
