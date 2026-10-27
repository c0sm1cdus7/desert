import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { objectType, text, principal, file, ownershipPolicy, createCommand, fromInput, actorId, mutationJourney, readJourney, controllerRole } from "../../src/index.ts";
import { compile } from "../../src/compile.ts";
import { product } from "../../src/contracts.ts";
import { openLocalController } from "../../src/local/controller.ts";
import type { postgresCluster } from "./postgres.ts";
import { imageQuota } from "./private-images.ts";
import { chromium } from "playwright";

const Clip = objectType({ id: "clip", facts: { description: text(), media: file({ accept: ["image/jpeg", "image/png", "image/webp", "video/mp4", "audio/mp4", "audio/mpeg", "audio/wav"], maxBytes: 20_971_520 }), owner: principal() } });
const Controller = controllerRole({ id: "clips", objects: [Clip], requires: [] });
const requires = { controller: Controller, dependencies: [] };
export const ImportClip = mutationJourney("import-clip", createCommand("import-clip-record", Clip, {
  input: ["description", "media"], values: { description: fromInput("description"), media: fromInput("media"), owner: actorId() },
}), requires);
export const ReadClips = readJourney("read-clips", Clip, { fields: ["description", "media"], collection: ["description"], requires });
export const ReadDescriptions = readJourney("read-descriptions", Clip, { fields: ["description"], collection: ["description"], requires });
export const mediaApplication = compile(product({ id: "private-clips", objects: [Clip], dependencies: [Controller],
  policies: [ownershipPolicy(Clip, "owner")], journeys: [ImportClip, ReadClips, ReadDescriptions],
  surfaces: [{ id: "agent", kind: "agent", journeys: [ImportClip, ReadClips, ReadDescriptions].map(journey => journey.id) }],
}));

/** A real, silent PCM WAV generated locally; no network or copyrighted fixture. */
export function pcmWave() {
  const samples = 8000, bytes = Buffer.alloc(44 + samples * 2);
  bytes.write("RIFF", 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36); bytes.writeUInt32LE(samples * 2, 40);
  return bytes;
}

/** Encode our own colored frames with the browser's installed H.264 encoder. */
export async function recordedMp4() {
  const browser=await chromium.launch();
  try {
    const page=await browser.newPage();
    return Buffer.from(await page.evaluate(async()=>{
      const canvas=document.createElement("canvas");canvas.width=64;canvas.height=64;
      const context=canvas.getContext("2d")!,stream=canvas.captureStream(10);
      const recorder=new MediaRecorder(stream,{mimeType:"video/mp4;codecs=avc1.42001E"}),parts:Blob[]=[];
      recorder.ondataavailable=event=>parts.push(event.data);
      const done=new Promise<void>(resolve=>recorder.onstop=()=>resolve());
      recorder.start();let frame=0;
      const interval=setInterval(()=>{context.fillStyle=++frame%2?"red":"blue";context.fillRect(0,0,64,64);},50);
      await new Promise(resolve=>setTimeout(resolve,1100));recorder.stop();await done;
      clearInterval(interval);stream.getTracks().forEach(track=>track.stop());
      return Array.from(new Uint8Array(await new Blob(parts).arrayBuffer()));
    }));
  } finally { await browser.close(); }
}

export async function privateMediaFixture(cluster: ReturnType<typeof postgresCluster>) {
  const database = await cluster.database();
  const privateImages = { directory: join(await mkdtemp(join(tmpdir(), "desert-private-media-")), "assets"), quota: imageQuota };
  const host = await openLocalController(mediaApplication, { ...database, roles: [Controller.id], privateImages });
  const owner = await host.identities.issue("Owner"), other = await host.identities.issue("Other");
  const session = host.connect(owner.token, "agent"), foreign = host.connect(other.token, "agent");
  const bytes = pcmWave();
  async function stage() {
    const run = await session.begin(ImportClip.id);
    const reservation = await session.reserveImage(run.id, "media", bytes.length);
    const asset = await session.uploadImage(run.id, "media", reservation.reference, [bytes]);
    return { run, asset };
  }
  return { database, privateImages, host, owner, other, session, foreign, bytes, stage };
}
