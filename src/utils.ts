/**
 * Shared utilities and constants for the Reading Time extension
 */

export const MIN_WORDS_PER_MINUTE = 50;
export const MAX_WORDS_PER_MINUTE = 1000;
export const DEFAULT_WORDS_PER_MINUTE = 200;

/**
 * Count words in text
 */
export function countWords(text: string): number {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  return words.length;
}

/**
 * Validate that a WPM value is within the supported range
 */
export function isValidWordsPerMinute(wpm: number): boolean {
  return (
    !Number.isNaN(wpm) &&
    wpm >= MIN_WORDS_PER_MINUTE &&
    wpm <= MAX_WORDS_PER_MINUTE
  );
}
