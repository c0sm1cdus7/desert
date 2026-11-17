// Compone llaves de puertas desde variables declaradas y rechaza material repetido aun con otra codificación.
import { timingSafeEqual } from "node:crypto";
import { environmentDoorKey, type KeyEnvironment } from "../../../runtime/environment-key.ts";
import { cloudTexts } from "../../../texts/cloud.texts.ts";
import type { DoorKey } from "./socket-peer.ts";
export type DoorKeyVariable = DoorKey & Readonly<{ variable: string }>;
export function environmentDoorKeys(
  environment: KeyEnvironment,
  declaration: readonly DoorKeyVariable[],
): ReadonlyMap<string, DoorKey> {
  const keys = new Map<string, DoorKey>(),
    decoded: Buffer[] = [];
  try {
    for (const { variable, identity, door } of declaration) {
      const bytes = environmentDoorKey(environment, variable);
      const repeated = decoded.some(other => other.length === bytes.length && timingSafeEqual(other, bytes));
      decoded.push(bytes);
      if (repeated) throw new Error(cloudTexts.repeated(variable));
      const value = environment[variable];
      if (!value) throw new Error(cloudTexts.door(variable));
      keys.set(value, Object.freeze({ identity, door }));
    }
    return keys;
  } finally {
    decoded.forEach(bytes => bytes.fill(0));
  }
}
