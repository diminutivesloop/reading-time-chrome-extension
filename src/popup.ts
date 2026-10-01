/**
 * Popup script - handles user interaction with the extension popup
 */

import {
  GetDebugStateMessage,
  GetDebugStateResponse,
  GetPageStatsMessage,
  StartCustomArticleSelectionMessage,
  StartReadingTestMessage,
  ToggleDebugMessage,
  type GetPageStatsResponse,
} from "./messages";
import type { PageStats } from "./page-stats";
import {
  MIN_WORDS_PER_MINUTE,
  MAX_WORDS_PER_MINUTE,
  isValidWordsPerMinute,
} from "./shared";
import {
  getWordsPerMinute,
  setWordsPerMinute,
  resetWordsPerMinute,
} from "./wpm-storage";

const analyzeBtn = document.getElementById("analyzeBtn") as HTMLButtonElement;
const customArticleSelectionBtn = document.getElementById(
  "customArticleSelectionBtn",
) as HTMLButtonElement;
const wordCountEl = document.getElementById("wordCount") as HTMLElement;
const readingTimeEl = document.getElementById("readingTime") as HTMLElement;
const wpmInput = document.getElementById("wpmInput") as HTMLInputElement;
const resetWpmBtn = document.getElementById("resetWpmBtn") as HTMLButtonElement;
const errorEl = document.getElementById("error") as HTMLElement;
const debugModeEl = document.getElementById("debugMode") as HTMLInputElement;
const startSpeedTestBtn = document.getElementById(
  "startSpeedTestBtn",
) as HTMLButtonElement;

if (analyzeBtn) {
  analyzeBtn.addEventListener("click", async () => {
    if (await saveWpmSetting()) {
      analyzeCurrentPage();
    }
  });
}

if (resetWpmBtn) {
  resetWpmBtn.addEventListener("click", resetWpmSetting);
}

if (debugModeEl) {
  debugModeEl.addEventListener("change", () => {
    toggleDebugMode(debugModeEl.checked);
  });
}

if (startSpeedTestBtn) {
  startSpeedTestBtn.addEventListener("click", startReadingSpeedTest);
}

if (customArticleSelectionBtn) {
  customArticleSelectionBtn.addEventListener(
    "click",
    startCustomArticleSelection,
  );
}

if (wpmInput) {
  wpmInput.addEventListener("focus", () => {
    wpmInput.select();
  });

  wpmInput.addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
      if (await saveWpmSetting()) {
        analyzeCurrentPage();
      }
    }
  });
}

/**
 * Save the WPM setting to storage after validating the input
 * @returns Boolean indicating whether save was successful
 */
async function saveWpmSetting(): Promise<boolean> {
  clearError();

  const wpm = parseInt(wpmInput.value, 10);

  // Validate input
  if (!isValidWordsPerMinute(wpm)) {
    showError(
      `Please enter a value between ${MIN_WORDS_PER_MINUTE} and ${MAX_WORDS_PER_MINUTE}`,
    );
    return false;
  }

  // Save the WPM setting
  await setWordsPerMinute(wpm);
  return true;
}

/**
 * Analyze the current page and display statistics
 */
async function analyzeCurrentPage(): Promise<void> {
  clearError();

  try {
    const wpm = await getWordsPerMinute();
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab.id) {
      chrome.tabs.sendMessage<GetPageStatsMessage, GetPageStatsResponse>(
        tab.id,
        { action: "getPageStats", wordsPerMinute: wpm },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error analyzing page:", chrome.runtime.lastError);
            showError("Error analyzing page");
            return;
          }
          displayStats(response.stats);
        },
      );
    }
  } catch (error) {
    console.error("Error:", error);
    showError("Error analyzing page");
  }
}

/**
 * Display statistics on the popup
 */
async function displayStats(stats: PageStats): Promise<void> {
  clearError();

  try {
    const { wordCount } = stats;
    const readingTime = stats.readingMinutes;

    if (wordCountEl) {
      wordCountEl.textContent = `${wordCount.toLocaleString()} Words`;
    }
    if (readingTimeEl && typeof readingTime === "number") {
      readingTimeEl.textContent =
        readingTime <= 1 ? "< 1 min" : `${readingTime} min`;
    }
  } catch (error) {
    console.error("Error displaying stats:", error);
    showError("Error calculating reading time");
  }
}

/**
 * Show error message
 */
function showError(message: string): void {
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add("show");
  }
}

/**
 * Clear error message
 */
function clearError(): void {
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.classList.remove("show");
  }
}

/**
 * Load and display the current WPM setting
 */
async function loadWpmSetting(): Promise<void> {
  try {
    if (wpmInput) {
      wpmInput.value = (await getWordsPerMinute()).toString();
    }
  } catch (error) {
    console.error("Error loading WPM setting:", error);
    showError("Error loading WPM setting");
  }
}

/**
 * Reset the WPM setting to default
 */
async function resetWpmSetting(): Promise<void> {
  clearError();

  try {
    const wpm = await resetWordsPerMinute();

    // Update the input to show the default value
    if (wpmInput) {
      wpmInput.value = wpm.toString();
    }

    // Re-analyze if stats are already shown
    if (wordCountEl && wordCountEl.textContent !== "-") {
      analyzeCurrentPage();
    }
  } catch (error) {
    console.error("Error resetting WPM setting:", error);
    showError("Error resetting setting");
  }
}

/**
 * Send a start-reading-test message to the active tab's content script
 */
async function startReadingSpeedTest(): Promise<void> {
  clearError();

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab.id) {
      chrome.tabs.sendMessage<StartReadingTestMessage>(
        tab.id,
        { action: "startReadingTest" },
        () => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error starting reading test:",
              chrome.runtime.lastError,
            );
            showError("Error starting reading test");
            return;
          }
          window.close();
        },
      );
    }
  } catch (error) {
    console.error("Error starting reading test:", error);
    showError("Error starting reading test");
  }
}

/**
 * Start custom article selection on the active tab.
 * The popup closes so the user can click on the page.
 */
async function startCustomArticleSelection(): Promise<void> {
  clearError();

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab.id) {
      chrome.tabs.sendMessage<StartCustomArticleSelectionMessage>(
        tab.id,
        { action: "startCustomArticleSelection" },
        () => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error starting custom article selection:",
              chrome.runtime.lastError,
            );
            showError("Error starting custom article selection");
            return;
          }

          window.close();
        },
      );
    }
  } catch (error) {
    console.error("Error starting custom article selection:", error);
    showError("Error starting custom article selection");
  }
}

/**
 * Toggle debug mode on the active tab
 */
async function toggleDebugMode(enabled: boolean): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab.id) {
      chrome.tabs.sendMessage<ToggleDebugMessage>(
        tab.id,
        {
          action: "toggleDebug",
          enabled,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error toggling debug mode:",
              chrome.runtime.lastError,
            );
            showError("Error toggling debug mode");
          }
        },
      );
    }
  } catch (error) {
    console.error("Error toggling debug mode:", error);
    showError("Error toggling debug mode");
  }
}

/**
 * Query the content script to check if debug mode is active on the current page
 */
async function loadDebugSetting(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab.id && debugModeEl) {
      chrome.tabs.sendMessage<GetDebugStateMessage, GetDebugStateResponse>(
        tab.id,
        { action: "getDebugState" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error loading debug state:",
              chrome.runtime.lastError,
            );
            showError("Error loading debug state");
            return;
          }
          debugModeEl.checked = response.debugActive;
        },
      );
    }
  } catch (error) {
    console.error("Error loading debug setting:", error);
    showError("Error loading debug setting");
  }
}

// Load stats and settings when popup opens
window.addEventListener("load", async () => {
  loadDebugSetting();
  await loadWpmSetting();
  analyzeCurrentPage();
});
