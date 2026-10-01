import { vi } from "vitest";

export type ChromeMessageListener = (...args: any[]) => unknown;

export const chromeMessageListeners: ChromeMessageListener[] = [];

vi.stubGlobal("chrome", {
  runtime: {
    onMessage: {
      addListener(listener: ChromeMessageListener) {
        chromeMessageListeners.push(listener);
      },
    },
  },
  storage: {
    sync: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
});
