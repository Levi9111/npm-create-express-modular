/**
 * src/lib/utils/string.ts
 *
 * Shared string manipulation helpers used across the CLI.
 */

/**
 * English-aware pluralization — handles common irregular forms and
 * standard suffix rules (es, ies, i, etc.).
 *
 * @param word - A singular English noun (any case).
 * @returns The plural form of the word, in the same case as the input.
 */
export function pluralize(word: string): string {
  const lower = word.toLowerCase();

  const irregulars: Record<string, string> = {
    person: 'people',
    man: 'men',
    woman: 'women',
    child: 'children',
    tooth: 'teeth',
    foot: 'feet',
    mouse: 'mice',
    goose: 'geese',
    ox: 'oxen',
    leaf: 'leaves',
    knife: 'knives',
    wife: 'wives',
    life: 'lives',
    half: 'halves',
    self: 'selves',
    elf: 'elves',
    loaf: 'loaves',
    potato: 'potatoes',
    tomato: 'tomatoes',
    cactus: 'cacti',
    focus: 'foci',
    fungus: 'fungi',
    nucleus: 'nuclei',
    syllabus: 'syllabi',
    analysis: 'analyses',
    diagnosis: 'diagnoses',
    oasis: 'oases',
    thesis: 'theses',
    crisis: 'crises',
    phenomenon: 'phenomena',
    criterion: 'criteria',
    datum: 'data',
  };

  if (irregulars[lower]) return irregulars[lower];
  if (/(?:s|ss|sh|ch|x|z)$/i.test(word)) return word + 'es';
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + 'ies';
  if (/(?:us)$/i.test(word)) return word.slice(0, -2) + 'i';
  if (/(?:is)$/i.test(word)) return word.slice(0, -2) + 'es';
  if (/(?:on)$/i.test(word)) return word.slice(0, -2) + 'a';
  return word + 's';
}

/**
 * Capitalizes the first character of a string.
 *
 * @param str - Any string.
 * @returns The string with its first character uppercased.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
