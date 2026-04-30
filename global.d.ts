/**
 * Shared TypeScript types for message passing between
 * popup, content script, and background script
 */

/**
 * Page statistics from text analysis
 */
interface PageStats {
  wordCount: number;
  textLength: number;
  readingMinutes?: number;
}

/**
 * Message request sent to content script
 */
interface MessageRequest {
  action: string;
  enabled?: boolean;
  wordsPerMinute?: number;
}

/**
 * Message response from content script
 */
interface MessageResponse {
  stats?: PageStats;
  debugActive?: boolean;
  testActive?: boolean;
}
