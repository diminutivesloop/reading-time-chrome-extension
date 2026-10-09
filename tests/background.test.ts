import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupOrphanedReadingTitles } from "../src/background";
import { chromeMessageListeners } from "./setup";

const chromeApi = globalThis.chrome as any;
const backgroundMessageListener = chromeMessageListeners.at(-1)!;

function storageKeyForUrl(url: string): string {
  return `readingTitle:url:${encodeURIComponent(url)}`;
}

function dispatchMessage(request: unknown, tabId = 1): Promise<unknown> {
  return new Promise((resolve) => {
    backgroundMessageListener(request, { tab: { id: tabId } }, resolve);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  chromeApi.tabs.query.mockResolvedValue([]);
  chromeApi.storage.local.get.mockImplementation((keys: unknown) =>
    Promise.resolve(keys === null ? {} : {}),
  );
});

describe("background title storage", () => {
  it("removes URL records that are not used by an open tab", async () => {
    const openUrl = "https://example.com/open";
    const closedUrl = "https://example.com/closed";
    const openKey = storageKeyForUrl(openUrl);
    const closedKey = storageKeyForUrl(closedUrl);

    chromeApi.tabs.query.mockResolvedValue([{ id: 10, url: openUrl }]);
    chromeApi.storage.local.getKeys.mockResolvedValue([
      openKey,
      closedKey,
      "unrelatedSetting",
    ]);

    await cleanupOrphanedReadingTitles();

    expect(chromeApi.storage.local.remove).toHaveBeenCalledWith([closedKey]);
    expect(chromeApi.storage.local.remove).not.toHaveBeenCalledWith([openKey]);
    expect(chromeApi.storage.local.remove).not.toHaveBeenCalledWith([
      "unrelatedSetting",
    ]);
  });

  it("saves and restores a URL-keyed title", async () => {
    const url = "https://example.com/article";
    const key = storageKeyForUrl(url);
    const record = { title: "[4m] Article" };
    chromeApi.storage.local.get.mockResolvedValue({ [key]: record });
    const sendResponse = await dispatchMessage({
      action: "getPersistedReadingTitle",
      url,
    });

    expect(sendResponse).toEqual({
      action: "getPersistedReadingTitle",
      title: record.title,
    });

    await dispatchMessage({
      action: "saveReadingTitle",
      title: "[5m] Article",
      url,
    });
    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({
      [key]: { title: "[5m] Article" },
    });
  });

  it("cleans the previous URL when a tab navigates away", async () => {
    const oldUrl = "https://example.com/old";
    const oldKey = storageKeyForUrl(oldUrl);
    chromeApi.tabs.query.mockResolvedValue([{ id: 42, url: oldUrl }]);
    chromeApi.storage.local.getKeys.mockResolvedValue([oldKey]);

    await dispatchMessage(
      { action: "pageChanged", url: "https://example.com/new" },
      42,
    );

    expect(chromeApi.storage.local.remove).toHaveBeenCalledWith([oldKey]);
  });
});
