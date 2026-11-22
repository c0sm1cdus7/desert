// Reads keys from the explicit environment and hands out erasable bytes, with errors naming only the variable.
import { cloudTexts } from "../texts/cloud.texts.ts";
export type KeyEnvironment = Readonly<Record<string, string | undefined>>;
export function environmentRootKey(environment: KeyEnvironment, name: string): Buffer {
  const value = environment[name];
  if (!value || !/^[0-9a-f]{64}$/iu.test(value)) throw new Error(cloudTexts.root(name));
  return Buffer.from(value, "hex");
}
function canonicalBase64url(value: string): boolean {
  if (!/^[A-Za-z0-9_-]+$/u.test(value) || value.length % 4 === 1) return false;
  const last = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".indexOf(value.at(-1) ?? "");
  if (value.length % 4 === 2) return (last & 15) === 0;
  return value.length % 4 !== 3 || (last & 3) === 0;
}
export function environmentDoorKey(environment: KeyEnvironment, name: string): Buffer {
  const value = environment[name];
  if (!value) throw new Error(cloudTexts.door(name));
  const hex = /^(?:[0-9a-f]{2}){32,}$/iu.test(value);
  const valid = hex || canonicalBase64url(value);
  if (!valid) throw new Error(cloudTexts.door(name));
  const bytes = Buffer.from(value, hex ? "hex" : "base64url");
  if (bytes.length >= 32) return bytes;
  bytes.fill(0);
  throw new Error(cloudTexts.door(name));
}
