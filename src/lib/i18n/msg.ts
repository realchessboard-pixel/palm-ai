/**
 * Marks English text defined outside a component (lists, catalogues) for
 * translation. It returns the text unchanged; the translation script collects
 * every msg("…"), and the text is translated where it is shown (<T s={…} />
 * or tx(…)).
 */
export function msg(english: string): string {
  return english;
}
