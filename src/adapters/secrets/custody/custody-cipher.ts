import { createCipheriv, createDecipheriv, randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { CustodyError, type HouseKeyProvider } from "./house-keys.ts";
export class CustodyCipher {
  readonly #house: string;
  readonly #provider: HouseKeyProvider | undefined;
  #key: Uint8Array | undefined;
  constructor(house: string, provider?: HouseKeyProvider) {
    this.#house = house;
    this.#provider = provider;
  }
  private copyKey(create: boolean): void {
    const copy = this.#provider?.key(this.#house, create);
    try {
      if (!(copy instanceof Uint8Array) || copy.length !== 32) throw new CustodyError("E-CUSTODY-KEY");
      this.#key = Uint8Array.from(copy);
    } finally {
      if (copy instanceof Uint8Array) copy.fill(0);
    }
  }
  private load(create: boolean): Uint8Array {
    try {
      if (!this.#key) this.copyKey(create);
      if (this.#key?.length !== 32) throw new CustodyError("E-CUSTODY-KEY");
      return this.#key;
    } catch {
      throw new CustodyError("E-CUSTODY-KEY");
    }
  }
  seal(ref: string, value: string, create: boolean): string {
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.load(create), nonce);
    cipher.setAAD(Buffer.from(JSON.stringify([1, this.#house, ref])));
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return ["1", nonce.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(
      ".",
    );
  }
  open(ref: string, envelope: string): string {
    const key = this.load(false);
    try {
      const [version, nonce, tag, bytes, extra] = envelope.split(".");
      if (version !== "1" || !nonce || !tag || bytes === undefined || extra !== undefined) throw new Error();
      const iv = Buffer.from(nonce, "base64"),
        signature = Buffer.from(tag, "base64");
      if (iv.length !== 12 || signature.length !== 16) throw new Error();
      const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
      decipher.setAAD(Buffer.from(JSON.stringify([1, this.#house, ref])));
      decipher.setAuthTag(signature);
      return Buffer.concat([decipher.update(Buffer.from(bytes, "base64")), decipher.final()]).toString("utf8");
    } catch {
      throw new CustodyError("E-CUSTODY-INTEGRITY");
    }
  }
  sign(body: string): string {
    return createHmac("sha256", this.load(false))
      .update(JSON.stringify(["custody-fact-v1", this.#house, body]))
      .digest("hex");
  }
  verify(body: string, signature: string | undefined): void {
    if (
      !signature ||
      !/^[a-f0-9]{64}$/u.test(signature) ||
      !timingSafeEqual(Buffer.from(this.sign(body), "hex"), Buffer.from(signature, "hex"))
    )
      throw new CustodyError("E-CUSTODY-INTEGRITY");
  }
  close(): void {
    this.#key?.fill(0);
    this.#key = undefined;
  }
}
