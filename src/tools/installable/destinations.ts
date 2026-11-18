// Encodes unambiguous program, group and object destinations for the engine.
export const folderOf = (program: string, group: string): string => `${program}/${group}`;
export const objectOf = (program: string, group: string, object: string): string =>
  `${folderOf(program, group)}/${encodeURIComponent(object)}`;
export function localTarget(program: string, group: string, target: string): string {
  const folder = folderOf(program, group);
  return target === folder ? group : decodeURIComponent(target.slice(folder.length + 1));
}
