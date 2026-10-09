import { vi } from "vitest";

export type ChromeMessageListener = (...args: any[]) => unknown;

export const chromeMessageListeners: ChromeMessageListener[] = [];
export const chromeRuntimeInstalledListeners: ChromeMessageListener[] = [];
export const chromeRuntimeStartupListeners: ChromeMessageListener[] = [];
export const chromeTabsRemovedListeners: ChromeMessageListener[] = [];
export const chromeTabsUpdatedListeners: ChromeMessageListener[] = [];

vi.stubGlobal("chrome", {
  runtime: {
    sendMessage: vi.fn(() => Promise.resolve(undefined)),
    onInstalled: {
      addListener(listener: ChromeMessageListener) {
        chromeRuntimeInstalledListeners.push(listener);
      },
    },
    onStartup: {
      addListener(listener: ChromeMessageListener) {
        chromeRuntimeStartupListeners.push(listener);
      },
    },
    onMessage: {
      addListener(listener: ChromeMessageListener) {
        chromeMessageListeners.push(listener);
      },
    },
  },
  storage: {
    sync: {
      get: vi.fn((defaults) =>
        Promise.resolve(defaults === null ? {} : defaults),
      ),
      set: vi.fn(),
    },
    local: {
      getKeys: vi.fn(() => Promise.resolve([])),
      get: vi.fn((defaults) => Promise.resolve(defaults)),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([])),
    sendMessage: vi.fn(() => Promise.resolve(undefined)),
    onRemoved: {
      addListener(listener: ChromeMessageListener) {
        chromeTabsRemovedListeners.push(listener);
      },
    },
    onUpdated: {
      addListener(listener: ChromeMessageListener) {
        chromeTabsUpdatedListeners.push(listener);
      },
    },
  },
});
