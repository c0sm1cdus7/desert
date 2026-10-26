// One product that declares every fact kind the storage generator maps, including VOID's reference cycle
// (an album names its photos through mediaReferences, a photo names its albums through namedReferences).
// Two modules (tasks: project + task; albums: album + photo) for the one-module rule of multi-object changes (Q3);
// a task's trash is its `state` fact (Q2).
import { enumeration, imageAsset, integer, labels, mediaAsset, mediaReferences, namedReferences, objectType, ownershipPolicy,
  principal, references, text } from "../../src/index.ts";
import { product } from "../../src/contracts.ts";
import { clientInstallation } from "../../src/storage/client-installation.ts";

export const Project = objectType({ id: "project", unique: [["owner", "name"]], facts: {
  name: text({ minLength: 1, maxLength: 64 }), color: enumeration(["blue", "rose"]), owner: principal(),
} });
export const Album = objectType({ id: "photo-album", facts: {
  title: text({ minLength: 1, maxLength: 120 }), owner: principal(),
  cover: mediaReferences("album-photo", { media: "image", maxItems: 1, memberOf: "albums" }),
} });
export const Photo = objectType({ id: "album-photo", facts: {
  title: text(), image: imageAsset(), owner: principal(), albums: namedReferences(Album, { label: "title" }),
} });
export const Task = objectType({ id: "task", facts: {
  title: text({ minLength: 1, maxLength: 8 }), priority: integer({ minimum: 1, maximum: 5 }), estimate: integer(),
  status: enumeration(["open", "done"]), owner: principal(), tags: labels({ maxItems: 2, maxLength: 5 }),
  projects: references(Project, { label: "name", color: "color" }), recording: mediaAsset(), dueNote: text({ maxLength: 3 }),
  state: enumeration(["active", "trashed"]),
} });

export const StorageKinds = product({
  id: "storage-kinds", objects: [Project, Album, Photo, Task],
  policies: [ownershipPolicy(Project, "owner"), ownershipPolicy(Album, "owner"), ownershipPolicy(Photo, "owner"), ownershipPolicy(Task, "owner")],
});
export const storageKindsModules = { tasks: [Project.id, Task.id], albums: [Album.id, Photo.id] } as const;

/** The client installation every storage test database stands for: one client, one database, one language. */
export const SpanishClient = clientInstallation({ language: "es" });
