import { createCipheriv, createDecipheriv, randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { CustodyError, type HouseKeyProvider, type LedgerHead } from "./house-keys.ts";
/** No cached keys. The provider copy is erased on every exit, including malformed input. */
export class CustodyCipher {
  readonly #house: string;
  readonly #provider: HouseKeyProvider | undefined;
  readonly #active = new Set<Uint8Array>();
  constructor(house: string, provider?: HouseKeyProvider) {
    this.#house = house;
    this.#provider = provider;
  }
  #providerOf(): HouseKeyProvider {
    if (!this.#provider) throw new CustodyError("E-CUSTODY-PROVIDER");
    return this.#provider;
  }
  account(ref: string): string {
    return `${this.#house}-secret-${ref.replace(/^secret:/u, "")}`;
  }
  #using<T>(account: string, create: boolean, body: (key: Uint8Array) => T): T {
    let key: Uint8Array | undefined;
    try {
      try {
        key = this.#providerOf().key(account, create);
      } catch (error) {
        if (error instanceof CustodyError) throw error;
        throw new CustodyError("E-CUSTODY-KEY");
      }
      if (!(key instanceof Uint8Array) || key.length !== 32) throw new CustodyError("E-CUSTODY-KEY");
      this.#active.add(key);
      return body(key);
    } finally {
      if (key instanceof Uint8Array) {
        key.fill(0);
        this.#active.delete(key);
      }
    }
  }
  prepare(create: boolean): void {
    this.#using(this.#house, create, () => undefined);
    if (create && !this.head()) this.anchor({ count: 0, authentication: "" });
  }
  head(): LedgerHead | undefined {
    return this.#providerOf().head(this.#house);
  }
  anchor(head: LedgerHead): void {
    this.#providerOf().anchor(this.#house, head);
  }
  present(ref: string): boolean {
    return this.#providerOf().has(this.account(ref));
  }
  forget(ref: string): void {
    this.#providerOf().forget(this.account(ref));
  }
  forgetHouse(refs: readonly string[] = []): void {
    this.#providerOf().forgetHouse(
      this.#house,
      refs.map(ref => this.account(ref)),
    );
  }
  seal(ref: string, value: Uint8Array, create: boolean): string {
    try {
      const envelope = this.#using(this.account(ref), create, key => {
        const nonce = randomBytes(12),
          cipher = createCipheriv("aes-256-gcm", key, nonce);
        cipher.setAAD(Buffer.from(JSON.stringify([2, this.#house, ref])));
        const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
        return [
          "2",
          nonce.toString("base64"),
          cipher.getAuthTag().toString("base64"),
          encrypted.toString("base64"),
        ].join(".");
      });
      return `${envelope}.${this.sign(JSON.stringify([ref, envelope]))}`;
    } finally {
      value.fill(0);
    }
  }
  check(ref: string, envelope: string): void {
    const [version, nonce, tag, bytes, signature, extra] = envelope.split(".");
    if (
      version !== "2" ||
      !nonce ||
      !tag ||
      bytes === undefined ||
      extra !== undefined ||
      Buffer.from(nonce, "base64").length !== 12 ||
      Buffer.from(tag, "base64").length !== 16
    )
      throw new CustodyError("E-CUSTODY-INTEGRITY");
    this.verify(JSON.stringify([ref, [version, nonce, tag, bytes].join(".")]), signature);
  }
  open(ref: string, envelope: string): Uint8Array {
    this.check(ref, envelope);
    return this.#using(this.account(ref), false, key => {
      let partial: Buffer | undefined;
      try {
        const parts = envelope.split(".");
        const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(parts[1] ?? "", "base64"), {
          authTagLength: 16,
        });
        decipher.setAAD(Buffer.from(JSON.stringify([2, this.#house, ref])));
        decipher.setAuthTag(Buffer.from(parts[2] ?? "", "base64"));
        partial = decipher.update(Buffer.from(parts[3] ?? "", "base64"));
        const final = decipher.final();
        try {
          return Buffer.concat([partial, final]);
        } finally {
          final.fill(0);
        }
      } catch {
        throw new CustodyError("E-CUSTODY-INTEGRITY");
      } finally {
        partial?.fill(0);
      }
    });
  }
  signing<T>(work: (sign: (body: string) => string) => T): T {
    return this.#using(this.#house, false, key =>
      work(body =>
        createHmac("sha256", key)
          .update(JSON.stringify(["custody-fact-v2", this.#house, body]))
          .digest("hex"),
      ),
    );
  }
  sign(body: string): string {
    return this.signing(sign => sign(body));
  }
  verifying<T>(work: (verify: (body: string, signature: string | undefined) => void) => T): T {
    return this.signing(sign =>
      work((body, signature) => {
        if (
          !signature ||
          !/^[a-f0-9]{64}$/u.test(signature) ||
          !timingSafeEqual(Buffer.from(sign(body), "hex"), Buffer.from(signature, "hex"))
        )
          throw new CustodyError("E-CUSTODY-INTEGRITY");
      }),
    );
  }
  verify(body: string, signature: string | undefined): void {
    this.verifying(verify => verify(body, signature));
  }
  close(): void {
    for (const key of this.#active) key.fill(0);
    this.#active.clear();
  }
}
