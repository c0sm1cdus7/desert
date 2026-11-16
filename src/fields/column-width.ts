// The columns occupied by each painted character, shared with currency declarations.
export const wide = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]|\p{Extended_Pictographic}/u;
export const width = (text: string): number =>
  Array.from(text).reduce((sum, char) => sum + (wide.test(char) ? 2 : 1), 0);
