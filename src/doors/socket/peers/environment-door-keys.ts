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
      const value = environment[variable];
      const bytes = environmentDoorKey({ [variable]: value }, variable);
      const repeated = decoded.some(other => other.length === bytes.length && timingSafeEqual(other, bytes));
      decoded.push(bytes);
      if (repeated) throw new Error(cloudTexts.repeated(variable));
      if (!value) throw new Error(cloudTexts.door(variable));
      keys.set(value, Object.freeze({ identity, door }));
    }
    return keys;
  } finally {
    decoded.forEach(bytes => bytes.fill(0));
  }
}

/** The host passes this lazy source at startup; presence checks never read variable values. */
export function founderDoorKeys(
  environment: KeyEnvironment,
  declaration: readonly DoorKeyVariable[],
  warn?: (message: string) => void,
) {
  return {
    read: () => environmentDoorKeys(environment, declaration),
    present: () => declaration.some(({ variable }) => Object.hasOwn(environment, variable)),
    ...(warn ? { warn } : {}),
  };
}
