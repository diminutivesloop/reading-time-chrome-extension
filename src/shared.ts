/**
 * Shared utilities and constants for the Reading Time extension
 */

export const MIN_WORDS_PER_MINUTE = 50;
export const MAX_WORDS_PER_MINUTE = 1000;

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

/**
 * Get the element used for text extraction
 */
export function getTextElement(): Element {
  let mainElement = document.querySelector("main");
  if (!mainElement) {
    mainElement = document.querySelector('[role="main"]');
  }
  return mainElement || document.body;
}

/**
 * Extract text content from the page
 */
export function getPageText(): string {
  const textElement = getTextElement();
  const bodyText = (textElement as HTMLElement).innerText;
  return bodyText || "";
}
