import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { CustodyError, type HouseKeyProvider } from "./house-keys.ts";
export class CustodyCipher {
  private readonly house: string;
  private readonly provider: HouseKeyProvider | undefined;
  private key: Uint8Array | undefined;
  constructor(house: string, provider?: HouseKeyProvider) {
    this.house = house;
    this.provider = provider;
  }
  private load(create: boolean): Uint8Array {
    try {
      if (!this.key && this.provider) this.key = Uint8Array.from(this.provider.key(this.house, create));
      if (this.key?.length !== 32) throw new CustodyError("E-CUSTODY-KEY");
      return this.key;
    } catch {
      throw new CustodyError("E-CUSTODY-KEY");
    }
  }
  seal(ref: string, value: string, create: boolean): string {
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.load(create), nonce);
    cipher.setAAD(Buffer.from(JSON.stringify([1, this.house, ref])));
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
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(nonce, "base64"));
      decipher.setAAD(Buffer.from(JSON.stringify([1, this.house, ref])));
      decipher.setAuthTag(Buffer.from(tag, "base64"));
      return Buffer.concat([decipher.update(Buffer.from(bytes, "base64")), decipher.final()]).toString("utf8");
    } catch {
      throw new CustodyError("E-CUSTODY-INTEGRITY");
    }
  }
  close(): void {
    this.key?.fill(0);
    this.key = undefined;
  }
}
