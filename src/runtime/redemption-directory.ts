// HOME is the explicit trust root; retain every directory identity down to the destination.
import { closeSync, constants, fstatSync, lstatSync, openSync, readlinkSync } from "node:fs";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import { checkName } from "./redemption-files.ts";

function systemAlias(path: string) {
  for (const alias of ["/var", "/tmp"]) {
    if (path !== alias && !path.startsWith(`${alias}/`)) continue;
    const stat = lstatSync(alias);
    if (!stat.isSymbolicLink()) return path;
    const target = resolve(dirname(alias), readlinkSync(alias));
    if (stat.uid !== 0 || (stat.mode & 0o022) !== 0 || target !== `/private${alias}`)
      throw new Error("private-directory-alias");
    return `${target}${path.slice(alias.length)}`;
  }
  return path;
}

export function privateDirectory(path: string) {
  const home = process.env.HOME;
  if (!home || !isAbsolute(home)) throw new Error("private-home");
  const destination = systemAlias(resolve(path));
  const root = systemAlias(resolve(home));
  const inside = destination === root || destination.startsWith(`${root}${sep}`);
  const paths: string[] = [];
  for (let at = destination; ; at = dirname(at)) {
    paths.unshift(at);
    if (at === (inside ? root : sep)) break;
  }
  const opened: { path: string; fd: number }[] = [];
  const check = () => {
    if (systemAlias(resolve(path)) !== destination || systemAlias(resolve(home)) !== root)
      throw new Error("private-directory-alias");
    for (const entry of opened) {
      const stat = fstatSync(entry.fd);
      if (!stat.isDirectory() || stat.uid !== process.geteuid?.() || (stat.mode & 0o022) !== 0)
        throw new Error("private-directory");
      checkName(entry.fd, entry.path);
    }
  };
  const close = () => {
    for (const entry of opened.splice(0).reverse()) closeSync(entry.fd);
  };
  try {
    for (const path of paths) {
      opened.push({ path, fd: openSync(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW) });
      check();
    }
    return { check, close };
  } catch (error) {
    close();
    throw error;
  }
}
