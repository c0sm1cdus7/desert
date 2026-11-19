// Historical base64 encoding validates keys directly in erasable buffers, without intermediate text.
import { CustodyError } from "../../../src/keychain/custody/house-keys.ts";
const alphabet = Buffer.from("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
/** Base64 directly between buffers: Node's string encoder would leave an uneraseable key copy. */
export function encodeKey(bytes: Uint8Array): Buffer {
  const encoded = Buffer.alloc(Math.ceil(bytes.length / 3) * 4, 61);
  for (let i = 0, o = 0; i < bytes.length; i += 3, o += 4) {
    const bits = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    encoded[o] = alphabet[(bits >>> 18) & 63] ?? 0;
    encoded[o + 1] = alphabet[(bits >>> 12) & 63] ?? 0;
    if (i + 1 < bytes.length) encoded[o + 2] = alphabet[(bits >>> 6) & 63] ?? 0;
    if (i + 2 < bytes.length) encoded[o + 3] = alphabet[bits & 63] ?? 0;
  }
  return encoded;
}
export function decodeKey(output: Uint8Array): Uint8Array {
  const trimmed = Buffer.from(output);
  let start = 0,
    end = trimmed.length;
  while (start < end && [9, 10, 13, 32].includes(trimmed[start] ?? 0)) start++;
  while (end > start && [9, 10, 13, 32].includes(trimmed[end - 1] ?? 0)) end--;
  const key = Buffer.alloc(32);
  let encoded: Buffer | undefined;
  try {
    if (end - start !== 44 || trimmed[end - 1] !== 61) throw new CustodyError("E-CUSTODY-KEY");
    let bits = 0,
      count = 0,
      index = 0;
    for (let i = start; i < end - 1; i++) {
      const digit = alphabet.indexOf(trimmed[i] ?? 0);
      if (digit < 0) throw new CustodyError("E-CUSTODY-KEY");
      bits = (bits << 6) | digit;
      count += 6;
      if (count >= 8) {
        count -= 8;
        key[index++] = (bits >>> count) & 255;
      }
    }
    encoded = encodeKey(key);
    if (!encoded.equals(trimmed.subarray(start, end))) throw new CustodyError("E-CUSTODY-KEY");
    return key;
  } catch (error) {
    key.fill(0);
    throw error;
  } finally {
    encoded?.fill(0);
    trimmed.fill(0);
  }
}
