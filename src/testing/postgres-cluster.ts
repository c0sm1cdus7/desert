import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { renderCreateDatabase } from "../storage/render-ddl.ts";
import { testInstallation } from "./installation.ts";
// The cluster is created without a locale; macOS aborts a postmaster started without LC_ALL ("became multithreaded").
const postgresEnvironment = { ...process.env, LC_ALL: "C" };

export function postgresCluster() {
  const bin = process.env.DESERT_PG_BIN ?? execFileSync("pg_config", ["--bindir"], { encoding: "utf8" }).trim();
  const root = mkdtempSync("/tmp/desert-pg-");
  const data = join(root, "data");
  const socket = join(root, "socket");
  mkdirSync(socket, { mode: 0o700 });
  const run = (name: string, args: string[]) => execFileSync(join(bin, name), args, { stdio: "pipe", env: postgresEnvironment });
  let running = false;
  function start() {
    if (running) return;
    run("pg_ctl", ["-D", data, "-l", join(root, "postgres.log"), "-o", `-k ${socket} -h ''`, "-w", "start"]);
    running = true;
  }
  function stop() {
    if (running) run("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]);
    running = false;
  }
  try {
    run("initdb", ["-D", data, "-U", "desert", "--auth-local=trust", "--auth-host=reject", "--no-locale", "--encoding=UTF8"]);
    start();
  } catch (error) { stop(); rmSync(root, { recursive: true }); throw error; }
  let sequence = 0;
  return {
    start, stop,
    version: () => run("postgres", ["--version"]).toString().trim(),
    /** A new client installation: an empty database (its controller applies the generated DDL on open) and the
     * installation it stands for. */
    async database() {
      const database = `case_${++sequence}`;
      const admin = new Pool({ host: socket, user: "desert", database: "postgres" });
      try { await admin.query(renderCreateDatabase(database)); } finally { await admin.end(); }
      return { socketDirectory: socket, user: "desert", database, installation: testInstallation };
    },
    dispose() { stop(); rmSync(root, { recursive: true }); },
  };
}
