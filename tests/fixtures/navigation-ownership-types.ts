import { composeProduct, humanSurface } from "../../src/index.ts";
import { ArchiveNote, CreateNote, ReadNote } from "../../products/notebook/journeys.ts";
import { navigationOwnershipFixture } from "./navigation-ownership.ts";

const exposure = {
  id: "human", journeys: [CreateNote, ReadNote, ArchiveNote], locale: "en",
};
const standaloneSemantics = {
  id: "human", journeys: [CreateNote, ReadNote, ArchiveNote],
  fieldRepresentations: { "note.title": "text", "note.body": "paragraphs", "note.state": "text" } as const,
  commit: { "create-note": "submit", "archive-note": "review" } as const,
  language: { locale: "en", fields: { "note.title": "Title", "note.body": "Content", "note.state": "Status" },
    journeys: { "create-note": "Create note", "read-note": "Read notes", "archive-note": "Archive note" } } as const,
};

humanSurface(exposure);
const standalone = { ...standaloneSemantics, entry: ReadNote, primaryAction: CreateNote, subjectActions: [ArchiveNote] };
const withEntry = { ...exposure, entry: ReadNote };
const withPrimaryAction = { ...exposure, primaryAction: CreateNote };
const withSubjectActions = { ...exposure, subjectActions: [ArchiveNote] };
const withUndefinedEntry = { ...exposure, entry: undefined };

// @ts-expect-error A variable cannot smuggle a second entry into human exposure.
humanSurface(withEntry);
// @ts-expect-error A variable cannot smuggle a second primary action into human exposure.
humanSurface(withPrimaryAction);
// @ts-expect-error A variable cannot smuggle subject navigation into human exposure.
humanSurface(withSubjectActions);
// @ts-expect-error A full standalone declaration is still forbidden on a program exposure.
humanSurface(standalone);
// @ts-expect-error Even an explicit undefined entry is a forbidden navigation key.
humanSurface(withUndefinedEntry);
// @ts-expect-error A partial legacy declaration cannot restore a second navigation owner.
humanSurface({ ...standaloneSemantics, entry: ReadNote });
// @ts-expect-error A create mutation cannot restore an exposure entry.
humanSurface({ ...standalone, entry: CreateNote });
// @ts-expect-error A read cannot restore an exposure primary action.
humanSurface({ ...standalone, primaryAction: ReadNote });
// @ts-expect-error A creation command cannot restore exposure subject actions.
humanSurface({ ...standalone, subjectActions: [CreateNote] });

const { composition } = navigationOwnershipFixture();
composeProduct(composition);
const withStandaloneSurface = { ...composition, surfaces: [{ ...humanSurface(exposure),
  entry: ReadNote.id, primaryAction: CreateNote.id, subjectActions: [ArchiveNote.id] }] };
const withPartialNavigation = { ...composition, surfaces: [{ ...humanSurface(exposure), entry: ReadNote.id }] };
// @ts-expect-error A standalone surface variable cannot introduce another navigation owner into a composed product.
composeProduct(withStandaloneSurface);
// @ts-expect-error Partial navigation hidden inside a surface variable is not an allowed product exposure.
composeProduct(withPartialNavigation);
