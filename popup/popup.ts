/**
 * Popup script - handles user interaction with the extension popup
 */

const DEFAULT_WORDS_PER_MINUTE = 200; // Average reading speed

const analyzeBtn = document.getElementById("analyzeBtn") as HTMLButtonElement;
const wordCountEl = document.getElementById("wordCount") as HTMLElement;
const readingTimeEl = document.getElementById("readingTime") as HTMLElement;
const wpmDisplayEl = document.getElementById("wpmDisplay") as HTMLElement;
const wpmInput = document.getElementById("wpmInput") as HTMLInputElement;
const resetWpmBtn = document.getElementById("resetWpmBtn") as HTMLButtonElement;
const errorEl = document.getElementById("error") as HTMLElement;
const debugModeEl = document.getElementById("debugMode") as HTMLInputElement;

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

if (wpmInput) {
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
  if (isNaN(wpm) || wpm < 50 || wpm > 1000) {
    showError("Please enter a value between 50 and 1000");
    return false;
  }

  // Save the WPM setting
  await chrome.storage.sync.set({ wordsPerMinute: wpm });
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
      chrome.tabs.sendMessage(
        tab.id,
        { action: "getPageStats", wordsPerMinute: wpm },
        (response: MessageResponse) => {
          if (response && response.stats) {
            displayStats(response.stats);
          } else {
            showError("Could not analyze page");
          }
        },
      );
    }
  } catch (error) {
    console.error("Error:", error);
    showError("Error analyzing page");
  }
}

async function getWordsPerMinute(): Promise<number> {
  const { wordsPerMinute } = await chrome.storage.sync.get<{
    wordsPerMinute: number;
  }>({ wordsPerMinute: DEFAULT_WORDS_PER_MINUTE });
  return wordsPerMinute;
}

/**
 * Display statistics on the popup
 */
async function displayStats(stats: PageStats): Promise<void> {
  clearError();

  try {
    const { wordCount } = stats;
    const wpm = await getWordsPerMinute();
    const readingTime = stats.readingTime;

    if (wordCountEl) {
      wordCountEl.textContent = wordCount.toLocaleString();
    }
    if (readingTimeEl && typeof readingTime === "number") {
      readingTimeEl.textContent =
        readingTime <= 1 ? "< 1 min" : `${readingTime} min`;
    }
    if (wpmDisplayEl) {
      wpmDisplayEl.textContent = wpm.toString();
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
  }
}

/**
 * Reset the WPM setting to default
 */
async function resetWpmSetting(): Promise<void> {
  clearError();

  try {
    await chrome.storage.sync.set({
      wordsPerMinute: DEFAULT_WORDS_PER_MINUTE,
    });

    // Update the input to show the default value
    if (wpmInput) {
      wpmInput.value = DEFAULT_WORDS_PER_MINUTE.toString();
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
 * Toggle debug mode on the active tab
 */
async function toggleDebugMode(enabled: boolean): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: "toggleDebug",
        enabled,
      });
    }
  } catch (error) {
    console.error("Error toggling debug mode:", error);
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
      chrome.tabs.sendMessage(
        tab.id,
        { action: "getDebugState" },
        (response: MessageResponse) => {
          debugModeEl.checked = !!response?.debugActive;
        },
      );
    }
  } catch (error) {
    console.error("Error loading debug setting:", error);
  }
}

// Load stats and settings when popup opens
window.addEventListener("load", async () => {
  loadDebugSetting();
  await loadWpmSetting();
  analyzeCurrentPage();
});
