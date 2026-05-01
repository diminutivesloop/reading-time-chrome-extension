/**
 * Content script - runs in the context of web pages
 * Analyzes page content for reading statistics
 */

import type { MessageRequest, MessageResponse } from "./messages";
import type { PageStats } from "./page-stats";
import { countWords, getPageText } from "./shared";
import { isDebugActive, enableDebugMode, disableDebugMode } from "./debug";
import { startReadingTest, cancelReadingTest } from "./speed-test";

let originalPageTitle = document.title;
let lastAppliedReadingTitle: string | null = null;

/**
 * Calculate reading statistics
 */
function calculatePageStats(wordsPerMinute?: number): PageStats {
  const pageText = getPageText();

  const stats: PageStats = {
    wordCount: countWords(pageText),
    textLength: pageText.length,
  };

  if (wordsPerMinute && wordsPerMinute > 0) {
    stats.readingMinutes = Math.ceil(stats.wordCount / wordsPerMinute);
  }

  return stats;
}

/**
 * Prepend the latest estimate to the saved page title
 */
function appendReadingTimeToTitle(minutes: number): void {
  // If the page changed its own title, refresh the saved original title.
  if (!lastAppliedReadingTitle || document.title !== lastAppliedReadingTitle) {
    originalPageTitle = document.title;
  }

  const readingTimeLabel = minutes <= 1 ? "<1m" : `${minutes}m`;
  const updatedTitle = `[${readingTimeLabel}] ${originalPageTitle}`;
  document.title = updatedTitle;
  lastAppliedReadingTitle = updatedTitle;
}

// Clean up if the page is being unloaded
window.addEventListener("pagehide", cancelReadingTest);

/**
 * Listen for messages from the popup
 */
chrome.runtime.onMessage.addListener(
  (
    request: MessageRequest,
    _,
    sendResponse: (response?: MessageResponse) => void,
  ) => {
    if (request.action === "getPageStats") {
      const stats = calculatePageStats(request.wordsPerMinute);
      if (typeof stats.readingMinutes === "number") {
        appendReadingTimeToTitle(stats.readingMinutes);
      }
      sendResponse({ action: "getPageStats", stats });
    } else if (request.action === "toggleDebug") {
      if (request.enabled) {
        enableDebugMode();
      } else {
        disableDebugMode();
      }
      sendResponse();
    } else if (request.action === "getDebugState") {
      sendResponse({ action: "getDebugState", debugActive: isDebugActive() });
    } else if (request.action === "startReadingTest") {
      startReadingTest((wpm) => {
        const stats = calculatePageStats(wpm);
        if (typeof stats.readingMinutes === "number") {
          appendReadingTimeToTitle(stats.readingMinutes);
        }
      });
      sendResponse();
    }
  },
);
