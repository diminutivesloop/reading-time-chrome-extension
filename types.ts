/**
 * Shared TypeScript types for message passing between
 * popup, content script, and background script
 */

/**
 * Page statistics from text analysis
 */
export interface PageStats {
  wordCount: number;
  textLength: number;
}

/**
 * Message request sent to content script
 */
export interface MessageRequest {
  action: string;
  enabled?: boolean;
}

/**
 * Message response from content script
 */
export interface MessageResponse {
  stats?: PageStats;
  debugActive?: boolean;
}
