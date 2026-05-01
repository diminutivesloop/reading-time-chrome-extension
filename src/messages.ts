import type { PageStats } from "./page-stats";

/**
 * Supported message actions exchanged with the content script
 */
export type MessageAction =
  | "getPageStats"
  | "toggleDebug"
  | "getDebugState"
  | "startReadingTest";

/**
 * Message requests sent to the content script
 */
export interface GetPageStatsMessage {
  action: "getPageStats";
  wordsPerMinute: number;
}

export interface ToggleDebugMessage {
  action: "toggleDebug";
  enabled: boolean;
}

export interface GetDebugStateMessage {
  action: "getDebugState";
}

export interface StartReadingTestMessage {
  action: "startReadingTest";
}

export type MessageRequest =
  | GetPageStatsMessage
  | ToggleDebugMessage
  | GetDebugStateMessage
  | StartReadingTestMessage;

/**
 * Message responses sent back from the content script
 */
export interface GetPageStatsResponse {
  action: "getPageStats";
  stats: PageStats;
}

export interface GetDebugStateResponse {
  action: "getDebugState";
  debugActive: boolean;
}

export type MessageResponse = GetPageStatsResponse | GetDebugStateResponse;
