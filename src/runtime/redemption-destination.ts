// Reserve private storage before redemption and preserve a recovered key if publication loses a race.
import { everySaid } from "../fields/phrases.ts";
import { constants, closeSync, fsyncSync, unlinkSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { redemptionReservation, type RedemptionPhase } from "./redemption-reservation.ts";
import {
  checkName,
  checkPrivate,
  createPrivate,
  openPrivate,
  readPrivate,
  recoveryLimit,
  writePrivate,
} from "./redemption-files.ts";
import { privateDirectory } from "./redemption-directory.ts";
import { configuration, publish } from "./redemption-publication.ts";
import { doorTexts } from "../texts/doors.texts.ts";
export type RedemptionTarget = Readonly<{ file: string; name?: string }>;
export class RedemptionFailure extends Error {}
class ReservedDestination {
  private reservation: ReturnType<typeof redemptionReservation> | undefined;
  private directory: ReturnType<typeof privateDirectory> | undefined;
  private recovery: string;
  private prepared = false;
  private phase: RedemptionPhase = "reserved";
  private readonly attempt: string;
  private readonly target: RedemptionTarget;
  private descriptor: number | undefined;
  private saved = false;
  constructor(target: RedemptionTarget, attempt: string) {
    this.attempt = attempt;
    this.target = { ...target, file: resolve(target.file) };
    this.recovery = join(dirname(this.target.file), `.desert-redemption-${randomUUID()}`);
    try {
      this.directory = reserveDirectory(dirname(this.target.file));
      this.reservation = redemptionReservation(this.target.file, () => this.directory?.check());
      if (this.reservation.recovery && this.resume(this.reservation.recovery)) return;
      configuration(this.target);
      this.directory.check();
      this.descriptor = openPrivate(this.recovery, createPrivate, recoveryLimit);
      this.directory.check();
      fsyncSync(this.descriptor);
      this.reservation.record(this.recovery, attempt);
    } catch (error) {
      this.close();
      throw error instanceof RedemptionFailure ? error : new RedemptionFailure(destinationFailure(error));
    }
  }
  private resume(previous: string) {
    // Preserve even an empty or unsafe recovery until its descriptor has been checked.
    this.prepared = true;
    try {
      if (
        dirname(previous) !== dirname(this.target.file) ||
        !/^\.desert-redemption-[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(basename(previous))
      )
        throw new Error("recovery-path");
      this.recovery = previous;
      this.descriptor = openPrivate(previous, constants.O_RDWR, recoveryLimit);
      this.directory?.check();
      checkName(this.descriptor, previous);
      const content = readPrivate(this.descriptor, recoveryLimit);
      if (content && !/^[A-Za-z0-9_-]{43}\n?$/.test(content)) throw new Error("recovery-content");
      if (!content) {
        unlinkSync(previous);
        this.reservation?.clear();
        closeSync(this.descriptor);
        this.descriptor = undefined;
        this.prepared = false;
        this.recovery = join(dirname(this.target.file), `.desert-redemption-${randomUUID()}`);
        return false;
      }
    } catch {
      throw new RedemptionFailure(everySaid(doorTexts.unsafeRecovery));
    }
    this.phase = this.reservation?.phase ?? "uncertain";
    if (this.reservation?.attempt !== this.attempt) throw new RedemptionFailure(this.guidance());
    try {
      configuration(this.target);
    } catch {
      throw new RedemptionFailure(this.guidance());
    }
    return true;
  }
  close() {
    try {
      if (this.descriptor !== undefined) {
        if (!this.saved && !this.prepared) this.removeUnused();
        closeSync(this.descriptor);
        this.descriptor = undefined;
      }
    } finally {
      try {
        this.reservation?.close();
      } finally {
        this.reservation = undefined;
        this.directory?.close();
        this.directory = undefined;
      }
    }
  }
  private removeUnused() {
    try {
      this.checkRecovery();
      unlinkSync(this.recovery);
      this.reservation?.clear();
    } catch {
      // Keep a replaced or unsafe entry and its metadata for the owner to inspect.
    }
  }
  private checkRecovery() {
    try {
      if (this.descriptor === undefined) throw new Error("closed-reservation");
      this.directory?.check();
      this.reservation?.check();
      checkPrivate(this.descriptor, recoveryLimit);
      checkName(this.descriptor, this.recovery);
      return this.descriptor;
    } catch {
      throw new RedemptionFailure(everySaid(doorTexts.unsafeRecovery));
    }
  }
  prepare() {
    try {
      const fd = this.checkRecovery();
      if (this.prepared) {
        const key = readPrivate(fd, recoveryLimit).trim();
        if (!/^[A-Za-z0-9_-]{43}$/.test(key)) throw new Error("recovery-content");
        return key;
      }
      const key = randomBytes(32).toString("base64url");
      writePrivate(fd, `${key}\n`, recoveryLimit);
      this.prepared = true;
      return key;
    } catch {
      this.prepared = true;
      throw new RedemptionFailure(everySaid(doorTexts.unsafeRecovery));
    }
  }
  guidance() {
    const messages = { reserved: doorTexts.pending, uncertain: doorTexts.uncertain, confirmed: doorTexts.confirmed };
    return `${everySaid(messages[this.phase](this.recovery))} ${everySaid(doorTexts.resume)}`;
  }
  sending() {
    this.checkRecovery();
    if (this.phase === "confirmed") return;
    this.phase = "uncertain";
    this.reservation?.record(this.recovery, this.attempt, this.phase);
  }
  cancel() {
    this.prepared = false;
  }
  save(url: URL, key: string) {
    if (this.descriptor === undefined) throw new Error("closed-reservation");
    // Retain the checked inode even if the directory loses write permission during the exchange.
    try {
      this.checkRecovery();
      writePrivate(this.descriptor, `${key}\n`, recoveryLimit);
      this.phase = "confirmed";
      this.reservation?.record(this.recovery, this.attempt, this.phase);
      this.saved = true;
      publish(this.target, this.recovery, this.descriptor, url, key, () => this.directory?.check());
      this.reservation?.clear();
      this.saved = false;
      this.prepared = false;
    } catch (error) {
      throw error instanceof RedemptionFailure ? error : new RedemptionFailure(this.guidance());
    }
  }
}
export const reserveDestination = (target: RedemptionTarget, attempt = "") => new ReservedDestination(target, attempt);
function reserveDirectory(path: string) {
  try {
    return privateDirectory(path);
  } catch (error) {
    throw new RedemptionFailure(destinationFailure(error));
  }
}
function destinationFailure(error: unknown): string {
  return error instanceof Error && error.message === "private-outside-home"
    ? everySaid(doorTexts.outsideHome)
    : everySaid(doorTexts.destination);
}
