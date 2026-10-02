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
  resolveUniqueSelector,
} from "./article-selection";
import {
  getArticleSelector,
  setArticleSelector,
} from "./article-selector-storage";

let originalPageTitle = document.title;
let lastAppliedReadingTitle: string | null = null;

let customArticleElement: HTMLElement | null = null;
let persistedArticleElement: HTMLElement | null = null;

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
    customArticleElement ||
    persistedArticleElement ||
    nativeArticleElement ||
    mainElement ||
    document.body
  );
}

/**
 * Extract text content from the page
 */
export function getArticleText(): string {
  return getArticleElement().innerText ?? "";
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
 * Calculate stats and, when an estimate is available, show it in the title
 */
function updateTitleWithStats(wordsPerMinute: number): PageStats {
  const stats = calculatePageStats(wordsPerMinute);
  if (stats.readingMinutes) {
    appendReadingTimeToTitle(stats.readingMinutes);
  }
  return stats;
}

/**
 * Apply a selected article container and refresh reading-time title estimate.
 */
export async function applyCustomArticleSelection(element: HTMLElement) {
  // A tag+classes selector can match several elements, so climb to the
  // nearest ancestor (possibly the element itself) with a unique selector.
  const resolved = resolveUniqueSelector(element);
  if (!resolved) {
    console.debug(
      "[Reading Time] No unique selector found for selected element or its ancestors",
    );
    return;
  }
  const { element: resolvedElement, selector } = resolved;
  customArticleElement = resolvedElement;

  // Update debug mode to reflect new text element if active
  if (isDebugActive()) {
    disableDebugMode();
    enableDebugMode();
  }

  updateTitleWithStats(await getWordsPerMinute());

  setArticleSelector(location.hostname, selector)
    .then(() =>
      console.debug(
        "[Reading Time] Persisted article selector for",
        location.hostname,
        ":",
        selector,
      ),
    )
    .catch((error) => console.error("Error saving article selector:", error));
}

/**
 * Look up a saved article selector for this site and apply it if it resolves
 * to exactly one element, so the picked container survives page reloads.
 */
async function applyPersistedArticleSelector(): Promise<void> {
  const selector = await getArticleSelector(location.hostname);
  if (!selector) {
    console.debug(
      "[Reading Time] No persisted article selector found for",
      location.hostname,
    );
    return;
  }

  console.debug(
    "[Reading Time] Loaded article selector for",
    location.hostname,
    ":",
    selector,
  );

  let element: HTMLElement | null = null;
  try {
    element = getLoneElementBySelector(selector);
  } catch (error) {
    console.error("Error applying saved article selector:", error);
    return;
  }
  if (!element) {
    console.debug(
      "[Reading Time] Saved article selector did not match exactly one element:",
      selector,
    );
    return;
  }

  console.debug("[Reading Time] Saved article selector matched:", selector);
  persistedArticleElement = element;

  if (isDebugActive()) {
    disableDebugMode();
    enableDebugMode();
  }

  updateTitleWithStats(await getWordsPerMinute());
}

applyPersistedArticleSelector().catch((error) =>
  console.error("Error applying saved article selector:", error),
);

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
      const stats = updateTitleWithStats(request.wordsPerMinute);
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
      startReadingTest(updateTitleWithStats);
      sendResponse();
    } else if (request.action === "startCustomArticleSelection") {
      applyCustomArticleSelection(await startCustomArticleSelection());
      sendResponse();
    }
  },
);
