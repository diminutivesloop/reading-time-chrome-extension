/**
 * Content script - runs in the context of web pages
 * Analyzes page content for reading statistics
 */

import type { MessageRequest, MessageResponse } from "./messages";
import type { PageStats } from "./page-stats";
import { countWords } from "./shared";
import { isDebugActive, enableDebugMode, disableDebugMode } from "./debug";
import { startReadingTest, cancelReadingTest } from "./speed-test";
import { getWordsPerMinute } from "./wpm-storage";
import {
  startCustomArticleSelection,
  cancelCustomArticleSelection,
} from "./article-selection";

let originalPageTitle = document.title;
let lastAppliedReadingTitle: string | null = null;

let customArticleElement: HTMLElement | null = null;

function getLoneElementBySelector(
  selector: string,
  parent?: HTMLElement,
): HTMLElement | null {
  const elements = (parent || document).querySelectorAll<HTMLElement>(selector);
  return elements.length === 1 ? elements[0] : null;
}

/**
 * Get the element used for text extraction
 */
export function getArticleElement(): HTMLElement {
  let mainElement = getLoneElementBySelector("main");
  if (!mainElement) {
    mainElement = getLoneElementBySelector('[role="main"]');
  }
  const nativeArticleElement =
    mainElement && getLoneElementBySelector("article", mainElement);
  return (
    customArticleElement || nativeArticleElement || mainElement || document.body
  );
}

/**
 * Extract text content from the page
 */
export function getArticleText(): string {
  return getArticleElement().innerText;
}

/**
 * Calculate reading statistics
 */
export function calculatePageStats(wordsPerMinute?: number): PageStats {
  const pageText = getArticleText();

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

/**
 * Apply a selected article container and refresh reading-time title estimate.
 */
async function applyCustomArticleSelection(element: HTMLElement) {
  customArticleElement = element;

  // Update debug mode to reflect new text element if active
  if (isDebugActive()) {
    disableDebugMode();
    enableDebugMode();
  }

  const wordsPerMinute = await getWordsPerMinute();
  const stats = calculatePageStats(wordsPerMinute);
  if (stats.readingMinutes) {
    appendReadingTimeToTitle(stats.readingMinutes);
  }
}

// Clean up if the page is being unloaded
window.addEventListener("pagehide", () => {
  cancelReadingTest();
  cancelCustomArticleSelection();
});

/**
 * Listen for messages from the popup
 */
chrome.runtime.onMessage.addListener(
  async (
    request: MessageRequest,
    _,
    sendResponse: (response?: MessageResponse) => void,
  ) => {
    if (request.action === "getPageStats") {
      const stats = calculatePageStats(request.wordsPerMinute);
      if (stats.readingMinutes) {
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
        if (stats.readingMinutes) {
          appendReadingTimeToTitle(stats.readingMinutes);
        }
      });
      sendResponse();
    } else if (request.action === "startCustomArticleSelection") {
      applyCustomArticleSelection(await startCustomArticleSelection());
      sendResponse();
    }
  },
);
