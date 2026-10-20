import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

export const appleReferenceDirectory = fileURLToPath(new URL(
  "../../../references/apple-landmarks-2026-10-15/source/Landmarks/Landmarks/", import.meta.url));

/** Import trusted sample data at build time. No photographs are copied into the SDK or build. */
export function loadAppleReference(directory = appleReferenceDirectory) {
  const model = readFileSync(join(directory, "Model/LandmarkData.swift"), "utf8");
  const stringsSource = readFileSync(join(directory, "Resources/LandmarkData.xcstrings"), "utf8");
  const strings = JSON.parse(stringsSource).strings as Record<string, {
    localizations: { en: { stringUnit: { value: string } } };
  }>;
  const records = [...model.matchAll(/id: (\d+),\s+name: \.LandmarkData\.([\p{L}]+)Name,\s+continent: "([^"]+)"/gu)]
    .map(([, id, name, continent]) => {
      if (!id || !name || !continent) throw new Error("APPLE_SAMPLE_RECORD_INVALID");
      const key = name.replace(/([a-zçó])([A-Z])/g, "$1_$2").toUpperCase();
      const title = strings[`${key}_NAME`]?.localizations.en.stringUnit.value;
      const description = strings[`${key}_DESCRIPTION`]?.localizations.en.stringUnit.value;
      if (!title || !description) throw new Error("APPLE_SAMPLE_TRANSLATION_MISSING");
      return { id, facts: { title, description, continent }, image: `place-${id}`, thumbnail: `thumb-${id}` };
    });
  if (records.length !== 21) throw new Error("APPLE_SAMPLE_REVISION_CHANGED");
  return {
    sourceRoot: join(directory, "Resources/Assets.xcassets"),
    source: {
      id: "apple.landmarks.sample", revision: createHash("sha256").update(model).update(stringsSource).digest("hex"),
      records,
      assets: records.flatMap(record => [
        { id: record.image, path: `Landmark backgrounds/${record.id}.imageset/${record.id}@2x.jpg`, alt: record.facts.title },
        { id: record.thumbnail, path: `Landmark thumbnails/${record.id}-thumb.imageset/${record.id}-thumb@2x.jpg`, alt: record.facts.title },
      ]),
    },
  };
}
