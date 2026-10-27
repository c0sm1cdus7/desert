// A product whose one file fact accepts a PDF, a ZIP and two image types (plan §15, step 7.4), its controller with a private
// store, two identities, and generated files of each kind: no network, no copyrighted bytes.
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32 } from "node:zlib";
import sharp from "sharp";
import { objectType, text, principal, file, ownershipPolicy, createCommand, fromInput, actorId, mutationJourney, readJourney,
  controllerRole } from "../../src/index.ts";
import { compile } from "../../src/compile.ts";
import { product } from "../../src/contracts.ts";
import { openLocalController } from "../../src/local/controller.ts";
import type { postgresCluster } from "./postgres.ts";

export const maxBytes = 2 * 1024 * 1024;
export const Attachment = objectType({ id: "attachment", facts: {
  title: text({ minLength: 1 }), document: file({ accept: ["application/pdf", "application/zip", "image/png", "image/jpeg"], maxBytes }),
  owner: principal() } });
const Controller = controllerRole({ id: "attachments", objects: [Attachment], requires: [] });
const requires = { controller: Controller, dependencies: [] };
export const Attach = mutationJourney("attach-file", createCommand("attach-file-record", Attachment, {
  input: ["title", "document"], values: { title: fromInput("title"), document: fromInput("document"), owner: actorId() } }), requires);
export const ReadAttachments = readJourney("read-attachments", Attachment, { fields: ["title", "document"], collection: ["title"], requires });
export const ReadTitles = readJourney("read-attachment-titles", Attachment, { fields: ["title"], collection: ["title"], requires });
export const Files = product({ id: "storage-files", objects: [Attachment], dependencies: [Controller],
  policies: [ownershipPolicy(Attachment, "owner")], journeys: [Attach, ReadAttachments, ReadTitles],
  surfaces: [{ id: "agent", kind: "agent", journeys: [Attach, ReadAttachments, ReadTitles].map(journey => journey.id) }] });
export const application = compile(Files);
const quota = { totalBytes: 1024 ** 3, identityBytes: 512 * 1024 ** 2, totalAssets: 12, identityAssets: 6 };

/** A one-page PDF with its cross-reference table, built here. */
export function pdf() {
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] >>"];
  let body = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => { const offset = body.length; body += `${index + 1} 0 obj\n${object}\nendobj\n`; return offset; });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}

/** A ZIP archive holding one stored (uncompressed) text file, built here. */
export function zip(name = "notes.txt", content = Buffer.from("files are objects\n")) {
  const fileName = Buffer.from(name), crc = crc32(content);
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(10, 4);
  local.writeUInt32LE(crc, 14); local.writeUInt32LE(content.length, 18); local.writeUInt32LE(content.length, 22); local.writeUInt16LE(fileName.length, 26);
  const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(10, 6);
  central.writeUInt32LE(crc, 16); central.writeUInt32LE(content.length, 20); central.writeUInt32LE(content.length, 24);
  central.writeUInt16LE(fileName.length, 28);
  const entry = Buffer.concat([local, fileName, content]), directory = Buffer.concat([central, fileName]);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(entry.length, 16);
  return Buffer.concat([entry, directory, end]);
}

export async function png() {
  return sharp({ create: { width: 300, height: 200, channels: 3, background: "#2a6f4e" } }).png().toBuffer();
}

export async function storageFilesFixture(cluster: ReturnType<typeof postgresCluster>) {
  const database = await cluster.database();
  const privateImages = { directory: join(await mkdtemp(join(tmpdir(), "desert-storage-files-")), "files"), quota };
  const host = await openLocalController(application, { ...database, roles: [Controller.id], privateImages });
  const owner = await host.identities.issue("Owner"), other = await host.identities.issue("Other");
  const session = host.connect(owner.token, "agent"), foreign = host.connect(other.token, "agent");
  /** Uploads `bytes` into a new attach run; answers the run and the staged value. */
  async function stage(bytes: Buffer, as = session) {
    const run = await as.begin(Attach.id);
    const reservation = await as.reserveImage(run.id, "document", bytes.length);
    return { run, asset: await as.uploadImage(run.id, "document", reservation.reference, [bytes]) };
  }
  /** Stages and accepts `bytes` as an attachment titled `title`; answers the staged value and the receipt. */
  async function attach(bytes: Buffer, title: string) {
    const { run, asset } = await stage(bytes);
    const intent = await session.prepare(run.id, { title, document: asset });
    return { asset, receipt: await session.accept(intent.id, intent.confirmationDigest) };
  }
  return { database, privateImages, host, owner, other, session, foreign, stage, attach };
}
