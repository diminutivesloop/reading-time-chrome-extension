import type { MessageRequest, MessageResponse } from "./messages";

const STORAGE_KEY_PREFIX = "readingTitle:";
const URL_STORAGE_KEY_PREFIX = `${STORAGE_KEY_PREFIX}url:`;

interface PersistedReadingTitle {
  title: string;
}

function storageKeyForUrl(url: string): string {
  return `${URL_STORAGE_KEY_PREFIX}${encodeURIComponent(url)}`;
}

function urlForStorageKey(key: string): string | undefined {
  if (!key.startsWith(URL_STORAGE_KEY_PREFIX)) return undefined;

  try {
    return decodeURIComponent(key.slice(URL_STORAGE_KEY_PREFIX.length));
  } catch {
    return undefined;
  }
}

export async function cleanupOrphanedReadingTitles(
  excludedTabId?: number,
): Promise<void> {
  try {
    console.debug("[Reading Time] Starting orphaned reading title cleanup");
    const tabs = await chrome.tabs.query({});
    const openTabs = tabs.filter((tab) => tab.id !== excludedTabId);
    const openUrls = new Set(
      openTabs
        .map((tab) => (typeof tab.url === "string" ? tab.url : undefined))
        .filter((url) => url !== undefined),
    );
    // Restored tabs may not be reported yet during browser startup. Preserve
    // data until a later activation or tab event can perform the sweep.
    if (tabs.length === 0) {
      console.debug(
        "[Reading Time] No open tabs detected, skipping orphaned title cleanup",
      );
      return;
    }

    const orphanedKeys: string[] = [];

    for (const key of await chrome.storage.local.getKeys()) {
      const storedUrl = urlForStorageKey(key);
      if (storedUrl !== undefined) {
        if (!openUrls.has(storedUrl)) orphanedKeys.push(key);
      }
    }

    if (orphanedKeys.length === 0) return;

    await chrome.storage.local.remove(orphanedKeys);
    console.debug("[Reading Time] Removed orphaned tab titles", orphanedKeys);
  } catch (error) {
    console.error("Error cleaning up orphaned reading titles:", error);
  }
}

chrome.runtime.onInstalled.addListener(() => cleanupOrphanedReadingTitles());
chrome.runtime.onStartup.addListener(() => cleanupOrphanedReadingTitles());
// Also sweep whenever the service worker is activated, including extension
// reloads and other cases where the normal lifecycle events were missed.
cleanupOrphanedReadingTitles();

chrome.runtime.onMessage.addListener(
  (
    request: MessageRequest,
    sender,
    sendResponse: (response?: MessageResponse) => void,
  ) => {
    const tabId = sender.tab?.id;
    if (typeof tabId !== "number") return;

    (async () => {
      if (request.action === "getPersistedReadingTitle") {
        const key = storageKeyForUrl(request.url);
        const result = await chrome.storage.local.get<{
          [key: string]: PersistedReadingTitle;
        }>([key]);
        const stored = result[key];
        const title = stored?.title;

        if (stored && !title) {
          await chrome.storage.local.remove(key);
        }

        if (title) {
          console.debug("[Reading Time] Restored tab title", {
            tabId,
            title,
            url: request.url,
          });
        }
        sendResponse({
          action: "getPersistedReadingTitle",
          title,
        });
      } else if (request.action === "saveReadingTitle") {
        await chrome.storage.local.set({
          [storageKeyForUrl(request.url)]: {
            title: request.title,
          } satisfies PersistedReadingTitle,
        });
        console.debug("[Reading Time] Saved tab title", {
          tabId,
          title: request.title,
          url: request.url,
        });
        sendResponse();
      } else if (request.action === "pageChanged") {
        await cleanupOrphanedReadingTitles(tabId);
        console.debug("[Reading Time] Cleared tab title after page change", {
          tabId,
          url: request.url,
        });
        sendResponse();
      }
    })().catch((error) => {
      console.error("Error managing persisted reading title:", error);
      sendResponse();
    });

    return true;
  },
);

chrome.tabs.onRemoved.addListener(() => cleanupOrphanedReadingTitles());

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (!changeInfo.url) return;

  cleanupOrphanedReadingTitles();
  console.debug("[Reading Time] Cleared tab title after page change", {
    tabId,
    url: changeInfo.url,
  });

  try {
    await chrome.tabs.sendMessage(tabId, { action: "pageChanged" });
  } catch {
    // A full navigation may have already discarded the content script.
  }
});
