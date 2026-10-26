// Where a name may break across lines without a hyphen, as pieces that each hold together (a renderer sets a line-break
// opportunity between them): a path after each separator and before its file's extension, never inside a word. On a narrow
// page (`loose`) a name written as one word also breaks after a dot between words (a dotted id, control.money) and where a
// capital starts its next word (an owner, MediaReferenceSelector): English hyphenates no capitalised word, so those are its
// only honest breaks.
const path = /(?<=\/)(?=.)|(?=\.[^./\s]+$)/u;
const words = /(?<=\p{Ll})(?=\p{Lu})|(?<=\.)(?=\p{L})(?![^./\s]*$)/u;
const pathAndWords = new RegExp(`${path.source}|${words.source}`, "u");
const nameAndWords = /(?<=\p{Ll})(?=\p{Lu})|(?<=\.)(?=\p{L})/u;

/** The pieces of `text`; a value that is no path, or holds a space, is one piece unless a narrow page needs its words. */
export function nameParts(text: string, loose: boolean): readonly string[] {
  const single = !/\s/.test(text);
  if (text.includes("/")) return text.split(loose && single ? pathAndWords : path);
  return loose && single ? text.split(nameAndWords) : [text];
}
