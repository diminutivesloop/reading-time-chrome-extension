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
}

/**
 * Message request sent to content script
 */
interface MessageRequest {
  action: string;
  enabled?: boolean;
}

/**
 * Message response from content script
 */
interface MessageResponse {
  stats?: PageStats;
  debugActive?: boolean;
}
