/** words-per-minute setting */
const DEFAULT_WORDS_PER_MINUTE = 200;

const WPM_KEY = "wordsPerMinute";

export async function getWordsPerMinute(): Promise<number> {
  const { [WPM_KEY]: wordsPerMinute } = await chrome.storage.sync.get<{
    wordsPerMinute: number;
  }>({
    [WPM_KEY]: DEFAULT_WORDS_PER_MINUTE,
  });
  return wordsPerMinute;
}

export async function setWordsPerMinute(wpm: number): Promise<void> {
  await chrome.storage.sync.set({ [WPM_KEY]: wpm });
}

/** add-reading-time-to-title setting */
const ADD_READING_TIME_TO_TITLE_KEY = "addReadingTimeToTitle";

export async function getAddReadingTimeToTitle(): Promise<boolean> {
  const { [ADD_READING_TIME_TO_TITLE_KEY]: addReadingTimeToTitle = true } =
    await chrome.storage.sync.get<{
      [ADD_READING_TIME_TO_TITLE_KEY]: boolean;
    }>({ [ADD_READING_TIME_TO_TITLE_KEY]: true });
  return addReadingTimeToTitle;
}

export async function setAddReadingTimeToTitle(
  enabled: boolean,
): Promise<void> {
  await chrome.storage.sync.set({ [ADD_READING_TIME_TO_TITLE_KEY]: enabled });
}

/** per-site custom article selector setting */
function createArticleSelectorKey(hostname: string): string {
  return `articleSelector:${hostname}`;
}

export async function getArticleSelector(
  hostname: string,
): Promise<string | undefined> {
  const key = createArticleSelectorKey(hostname);
  const result = await chrome.storage.local.get<{ [key: string]: string }>([
    key,
  ]);
  return result[key];
}

export async function removeArticleSelector(hostname: string): Promise<void> {
  await chrome.storage.local.remove(createArticleSelectorKey(hostname));
}

export async function setArticleSelector(
  hostname: string,
  selector: string,
): Promise<void> {
  await chrome.storage.local.set({
    [createArticleSelectorKey(hostname)]: selector,
  });
}

const URL_READING_TITLE_KEY_PREFIX = `readingTitle:url:`;

interface PersistedReadingTitle {
  title: string;
}

function storageKeyForUrl(url: string): string {
  return `${URL_READING_TITLE_KEY_PREFIX}${encodeURIComponent(url)}`;
}

function urlForStorageKey(key: string): string | undefined {
  if (!key.startsWith(URL_READING_TITLE_KEY_PREFIX)) return undefined;

  try {
    return decodeURIComponent(key.slice(URL_READING_TITLE_KEY_PREFIX.length));
  } catch {
    return undefined;
  }
}

export async function getPersistedReadingTitle(
  url: string,
): Promise<string | undefined> {
  const key = storageKeyForUrl(url);
  const result = await chrome.storage.local.get<{
    [key: string]: PersistedReadingTitle;
  }>([key]);
  return result[key]?.title;
}

export async function saveReadingTitle(
  url: string,
  title: string,
): Promise<void> {
  await chrome.storage.local.set({
    [storageKeyForUrl(url)]: { title } satisfies PersistedReadingTitle,
  });
}

export async function removeReadingTitle(url: string): Promise<void> {
  await chrome.storage.local.remove(storageKeyForUrl(url));
}

export async function removeOrphanedReadingTitles(
  openUrls: ReadonlySet<string>,
): Promise<string[]> {
  const orphanedKeys: string[] = [];
  for (const key of await chrome.storage.local.getKeys()) {
    const storedUrl = urlForStorageKey(key);
    if (storedUrl !== undefined && !openUrls.has(storedUrl)) {
      orphanedKeys.push(key);
    }
  }

  if (orphanedKeys.length > 0) {
    await chrome.storage.local.remove(orphanedKeys);
  }
  return orphanedKeys;
}
