import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const dummySalt = randomBytes(32).toString("hex");
let concurrent = 0;
async function derive(password: string, salt: string): Promise<Buffer> {
  if (concurrent >= 4) throw new Error("ACCESS_BUSY");
  concurrent++;
  try {
    return await new Promise<Buffer>((resolve, reject) =>
      scrypt(password, salt, 64, options, (error, result) => error ? reject(error) : resolve(result)));
  } finally { concurrent--; }
}
export async function hashPassword(password: string) {
  const salt = randomBytes(32).toString("hex");
  return { salt, hash: (await derive(password, salt)).toString("hex") };
}
export async function passwordMatches(password: string, salt?: string, hash?: string) {
  const candidate = await derive(password, salt ?? dummySalt);
  const expected = hash && /^[a-f0-9]{128}$/.test(hash) ? Buffer.from(hash, "hex") : Buffer.alloc(64);
  return timingSafeEqual(candidate, expected) && hash !== undefined;
}
