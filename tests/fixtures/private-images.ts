import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { objectType, text, principal, imageAsset, enumeration, ownershipPolicy, createCommand, fromInput, actorId, literal, mutationJourney, readJourney, updateCommand, controllerRole } from "../../src/index.ts";
import { compile } from "../../src/compile.ts";
import { product } from "../../src/contracts.ts";
import { openLocalController } from "../../src/local/controller.ts";
import type { postgresCluster } from "./postgres.ts";

export const Photo = objectType({ id: "photo", facts: {
  title: text({ minLength: 1 }), image: imageAsset(), owner: principal(), state: enumeration(["active", "archived"]),
} });
const Controller = controllerRole({ id: "photos", objects: [Photo], requires: [] });
const requires = { controller: Controller, dependencies: [] };
export const ImportPhoto = mutationJourney("import-photo", createCommand("import-photo-record", Photo, {
  input: ["title", "image"], values: { title: fromInput("title"), image: fromInput("image"), owner: actorId(), state: literal("active") },
}), requires);
export const ReadPhotos = readJourney("read-photos", Photo, {
  fields: ["title", "image"], collection: ["title"], where: { state: "active" }, requires,
});
export const ReadTitles = readJourney("read-titles", Photo, { fields: ["title"], collection: ["title"], requires });
export const ArchivePhoto = mutationJourney("archive-photo", updateCommand("archive-photo-record", Photo, {
  input: [], when: { state: "active" }, set: { state: literal("archived") },
}), requires);
export const application = compile(product({ id: "private-photos", objects: [Photo], dependencies: [Controller],
  policies: [ownershipPolicy(Photo, "owner")], journeys: [ImportPhoto, ReadPhotos, ReadTitles, ArchivePhoto],
  surfaces: [{ id: "agent", kind: "agent", journeys: [ImportPhoto, ReadPhotos, ReadTitles, ArchivePhoto].map(journey => journey.id) }],
}));
export const imageQuota = { totalBytes: 1024 ** 3, identityBytes: 512 * 1024 ** 2, totalAssets: 12, identityAssets: 6 };

export async function privateImagesFixture(cluster: ReturnType<typeof postgresCluster>) {
  const database = await cluster.database();
  const privateImages = { directory: join(await mkdtemp(join(tmpdir(), "desert-private-images-")), "images"), quota: imageQuota };
  const host = await openLocalController(application, { ...database, roles: [Controller.id], privateImages });
  const owner = await host.identities.issue("Owner"), other = await host.identities.issue("Other");
  const session = host.connect(owner.token, "agent"), foreign = host.connect(other.token, "agent");
  const bytes = await sharp({ create: { width: 240, height: 160, channels: 3, background: "#206db8" } }).jpeg().withMetadata().toBuffer();
  async function stage() {
    const run = await session.begin(ImportPhoto.id);
    const asset = await session.reserveImage(run.id, "image", bytes.length);
    assertSameReference(asset, await session.uploadImage(run.id, "image", asset.reference, [bytes]));
    return { run, asset };
  }
  return { database, privateImages, host, owner, other, session, foreign, bytes, stage };
}
function assertSameReference(expected: { reference: string }, actual: { reference: string }) {
  if (expected.reference !== actual.reference) throw new Error("STAGING_REFERENCE_CHANGED");
}
