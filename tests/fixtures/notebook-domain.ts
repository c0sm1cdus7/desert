import { objectType, ownershipPolicy, controllerRole, createCommand, updateCommand, mutationJourney, readJourney } from "../../src/index.ts";
import { Note as ProductNote } from "../../products/notebook/note.ts";
import { CreateNote as ProductCreate, ReadNote as ProductRead, ArchiveNote as ProductArchive } from "../../products/notebook/journeys.ts";
import { NotesController as ProductController } from "../../products/notebook/dependencies.ts";

// Independent authoring witnesses derive the example's domain, without borrowing its module-owned references.
export const Note = objectType(structuredClone(ProductNote));
export const OnlyOwnerCanAccess = ownershipPolicy(Note, "owner");
export const NotesController = controllerRole({ id: ProductController.id, objects: [Note], requires: [] });
const requires = { controller: NotesController, dependencies: [] };
export const CreateNote = mutationJourney(ProductCreate.id, createCommand(ProductCreate.command.id, Note, {
  input: ProductCreate.command.input, values: ProductCreate.command.values,
}), requires);
export const ReadNote = readJourney(ProductRead.id, Note, {
  fields: ProductRead.fields, collection: ProductRead.collection, requires,
});
export const ArchiveNote = mutationJourney(ProductArchive.id, updateCommand(ProductArchive.command.id, Note, {
  input: ProductArchive.command.input, when: ProductArchive.command.when, set: ProductArchive.command.set,
}), requires);
