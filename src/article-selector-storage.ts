/**
 * Storage helpers for per-site custom article selectors
 */

const STORAGE_KEY_PREFIX = "articleSelector:";

function storageKeyFor(hostname: string): string {
  return `${STORAGE_KEY_PREFIX}${hostname}`;
}

export async function getArticleSelector(
  hostname: string,
): Promise<string | undefined> {
  const key = storageKeyFor(hostname);
  const result = await chrome.storage.local.get<{ [key: string]: string }>([
    key,
  ]);
  return result[key];
}

export async function removeArticleSelector(hostname: string): Promise<void> {
  await chrome.storage.local.remove(storageKeyFor(hostname));
}

export async function setArticleSelector(
  hostname: string,
  selector: string,
): Promise<void> {
  await chrome.storage.local.set({ [storageKeyFor(hostname)]: selector });
}
