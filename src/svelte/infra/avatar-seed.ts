/** A seed is data, never executable markup or an externally fetched image. */
export function newAvatarSeed(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), byte => byte.toString(16).padStart(2, "0")).join("");
}
export function identityAvatarSeed(identity: string): string {
  let first = 2166136261, second = 5381;
  for (const character of identity) {
    first = Math.imul(first ^ character.charCodeAt(0), 16777619);
    second = Math.imul(second, 33) ^ character.charCodeAt(0);
  }
  return [first, second].map(value => (value >>> 0).toString(16).padStart(8, "0")).join("");
}
export function avatarGeometry(seed: string) {
  const safe = /^[a-f0-9]{16}$/.test(seed) ? seed : identityAvatarSeed(seed);
  const value = Number.parseInt(safe.slice(0, 8), 16) ^ Number.parseInt(safe.slice(8), 16);
  const palettes = [["#143139", "#37777a", "#a9d7be", "#e3d6ae"], ["#262944", "#6565a6", "#c6bce5", "#efc6b9"],
    ["#3e2738", "#a35368", "#d99a8b", "#f4e1bc"], ["#23394e", "#4a83ad", "#a0cdd6", "#eee4cc"]] as const;
  return { seed: safe, colors: palettes[(value >>> 0) % palettes.length]!, rotation: (value >>> 4) % 360 };
}
