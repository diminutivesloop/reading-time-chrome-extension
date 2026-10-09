import type { PageStats } from "./page-stats";

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

export interface StartCustomArticleSelectionMessage {
  action: "startCustomArticleSelection";
}

export interface GetCustomArticleStateMessage {
  action: "getCustomArticleState";
}

export interface ResetCustomArticleMessage {
  action: "resetCustomArticle";
}

export interface GetPersistedReadingTitleMessage {
  action: "getPersistedReadingTitle";
  url: string;
}

export interface SaveReadingTitleMessage {
  action: "saveReadingTitle";
  title: string;
  url: string;
}

export interface PageChangedMessage {
  action: "pageChanged";
  url?: string;
}

export type MessageRequest =
  | GetPageStatsMessage
  | ToggleDebugMessage
  | GetDebugStateMessage
  | StartReadingTestMessage
  | StartCustomArticleSelectionMessage
  | GetCustomArticleStateMessage
  | ResetCustomArticleMessage
  | GetPersistedReadingTitleMessage
  | SaveReadingTitleMessage
  | PageChangedMessage;

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

export interface GetCustomArticleStateResponse {
  action: "getCustomArticleState";
  active: boolean;
}

export interface ResetCustomArticleResponse {
  action: "resetCustomArticle";
  success: boolean;
}

export interface GetPersistedReadingTitleResponse {
  action: "getPersistedReadingTitle";
  title?: string;
}

export type MessageResponse =
  | GetPageStatsResponse
  | GetDebugStateResponse
  | GetCustomArticleStateResponse
  | ResetCustomArticleResponse
  | GetPersistedReadingTitleResponse;
