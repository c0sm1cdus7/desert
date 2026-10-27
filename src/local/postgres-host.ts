import { execFileSync } from "node:child_process";
import { closeSync, existsSync, lstatSync, mkdirSync, mkdtempSync, openSync, rmSync, unlinkSync } from "node:fs";
import { isAbsolute, join } from "node:path";
// The cluster is created without a locale; macOS aborts a postmaster started without LC_ALL ("became multithreaded").
const postgresEnvironment = { ...process.env, LC_ALL: "C" };

export function requirePrivatePath(path: string, directory: boolean) {
  const info = lstatSync(path);
  if (info.isSymbolicLink() || info.uid !== process.getuid?.() || (info.mode & 0o077) ||
    (directory ? !info.isDirectory() : !info.isFile())) throw new Error("PRIVATE_LOCAL_PATH_REQUIRED");
}

export function startLocalPostgres(directory: string) {
  if (!isAbsolute(directory)) throw new Error("ABSOLUTE_LOCAL_DIRECTORY_REQUIRED");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  requirePrivatePath(directory, true);
  const lockPath = join(directory, "runner.lock");
  const lock = openSync(lockPath, "wx", 0o600);
  const socketDirectory = mkdtempSync("/tmp/desert-local-");
  const data = join(directory, "postgres");
  let running = false;
  let bin: string;
  const run = (name: string, args: string[]) => execFileSync(join(bin, name), args, { stdio: "pipe", env: postgresEnvironment });
  function stop() {
    if (running) run("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]);
    running = false;
    closeSync(lock);
    unlinkSync(lockPath);
    rmSync(socketDirectory, { recursive: true });
  }
  try {
    bin = process.env.DESERT_PG_BIN ?? execFileSync("pg_config", ["--bindir"], { encoding: "utf8" }).trim();
    if (!existsSync(data)) {
      run("initdb", ["-D", data, "-U", "desert", "--auth-local=trust", "--auth-host=reject", "--no-locale", "--encoding=UTF8"]);
    }
    requirePrivatePath(data, true);
    run("pg_ctl", ["-D", data, "-l", join(directory, "postgres.log"),
      "-o", `-k ${socketDirectory} -h ''`, "-w", "start"]);
    running = true;
    return { database: { socketDirectory, database: "postgres", user: "desert" }, stop };
  } catch (error) { stop(); throw error; }
}
