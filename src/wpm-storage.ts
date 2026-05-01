/**
 * Storage helpers for the words-per-minute setting
 */

const DEFAULT_WORDS_PER_MINUTE = 200;

const STORAGE_KEY_WPM = "wordsPerMinute";

export async function getWordsPerMinute(): Promise<number> {
  const { [STORAGE_KEY_WPM]: wordsPerMinute } = await chrome.storage.sync.get<{
    wordsPerMinute: number;
  }>({
    [STORAGE_KEY_WPM]: DEFAULT_WORDS_PER_MINUTE,
  });
  return wordsPerMinute;
}

export async function setWordsPerMinute(wpm: number): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY_WPM]: wpm });
}

export async function resetWordsPerMinute(): Promise<number> {
  await setWordsPerMinute(DEFAULT_WORDS_PER_MINUTE);
  return DEFAULT_WORDS_PER_MINUTE;
}
