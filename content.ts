/**
 * Content script - runs in the context of web pages
 * Analyzes page content for reading statistics
 */

interface PageStats {
  wordCount: number;
  textLength: number;
}

interface MessageRequest {
  action: string;
}

interface MessageResponse {
  stats?: PageStats;
}

/**
 * Extract text content from the page
 */
function getPageText(): string {
  // Try to get text from main element first
  let mainElement = document.querySelector("main");

  // Fall back to element with role="main"
  if (!mainElement) {
    mainElement = document.querySelector('[role="main"]');
  }

  // Fall back to body if no main element found
  const textElement = mainElement || document.body;
  const bodyText = textElement.innerText;
  return bodyText || "";
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  return words.length;
}

/**
 * Calculate reading statistics
 */
function calculatePageStats(): PageStats {
  const pageText = getPageText();

  const stats: PageStats = {
    wordCount: countWords(pageText),
    textLength: pageText.length,
  };

  return stats;
}

/**
 * Listen for messages from the popup
 */
chrome.runtime.onMessage.addListener(
  (
    request: MessageRequest,
    _,
    sendResponse: (response: MessageResponse) => void,
  ) => {
    if (request.action === "getPageStats") {
      const stats = calculatePageStats();
      sendResponse({ stats });
    }
  },
);
