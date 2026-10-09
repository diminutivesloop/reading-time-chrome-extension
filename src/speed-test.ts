/**
 * Reading speed test feature module
 * Provides a floating timer bar to measure and save reading speed
 */

import { getArticleText } from "./content";
import {
  MIN_WORDS_PER_MINUTE,
  MAX_WORDS_PER_MINUTE,
  countWords,
  isValidWordsPerMinute,
} from "./shared";
import { setWordsPerMinute } from "./wpm-storage";
import themeCss from "./theme.css";

const TIMER_BAR_ID = "reading-time-speed-timer";
const TIMER_STYLE_ID = "reading-time-speed-timer-style";
const DISMISS_ICON = `
  <img src="https://api.iconify.design/tabler/x.svg?color=%23712636" width="16" height="16" alt="" />
`;

let testStartTime: number | null = null;
let testIntervalId: ReturnType<typeof setInterval> | null = null;
let onWpmSavedCallback: ((wpm: number) => void) | null = null;

/**
 * Inject styles for the floating reading-speed timer bar
 */
function ensureTimerStyles(): void {
  if (document.getElementById(TIMER_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = TIMER_STYLE_ID;
  style.textContent = `${themeCss}
    #${TIMER_BAR_ID} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      background: var(--reading-time-sepia);
      color: var(--reading-time-burgundy);
      border: 1px solid var(--reading-time-burgundy);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      border-radius: 12px;
      box-shadow: 0 8px 24px var(--reading-time-burgundy-shadow);
      padding: 14px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 280px;
      user-select: none;
    }
    #${TIMER_BAR_ID} .rt-btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
    }
    #${TIMER_BAR_ID} .rt-btn-dismiss {
      width: 34px;
      min-width: 34px;
      height: 34px;
      padding: 0;
    }
    #${TIMER_BAR_ID} .rt-timer-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    #${TIMER_BAR_ID} .rt-timer-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--reading-time-burgundy);
    }
    #${TIMER_BAR_ID} .rt-timer-value {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: var(--reading-time-burgundy);
    }
    #${TIMER_BAR_ID} .rt-timer-result {
      font-size: 18px;
      font-weight: 700;
      color: var(--reading-time-burgundy);
    }
    #${TIMER_BAR_ID} .rt-btn-save:disabled {
      opacity: 0.5;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Format elapsed seconds as M:SS
 */
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Create and show the timer bar in "running" state
 */
function showTimerBar(): void {
  removeTimerBar();
  ensureTimerStyles();

  const bar = document.createElement("div");
  bar.id = TIMER_BAR_ID;

  bar.innerHTML = `
    <div class="rt-timer-body">
      <span class="rt-timer-label">Reading Speed Test</span>
      <span class="rt-timer-value">0:00</span>
    </div>
    <button class="rt-btn rt-btn-stop reading-time-ui-button reading-time-ui-button-primary">Finish</button>
    <button class="rt-btn rt-btn-dismiss reading-time-ui-button reading-time-ui-button-secondary reading-time-ui-button-icon" aria-label="Dismiss">${DISMISS_ICON}</button>
  `;

  document.body.appendChild(bar);

  bar.querySelector(".rt-btn-stop")!.addEventListener("click", () => {
    finishReadingTest();
  });

  bar.querySelector(".rt-btn-dismiss")!.addEventListener("click", () => {
    cancelReadingTest();
  });
}

/**
 * Switch the timer bar to the "stopped / result" state
 */
function showResultBar(measuredWpm: number): void {
  const bar = document.getElementById(TIMER_BAR_ID);
  if (!bar) return;

  bar.innerHTML = `
    <div class="rt-timer-body">
      <span class="rt-timer-label">Your Reading Speed</span>
      <span class="rt-timer-result">${measuredWpm.toLocaleString()} WPM</span>
    </div>
    <button class="rt-btn rt-btn-save reading-time-ui-button reading-time-ui-button-primary">Save as WPM</button>
    <button class="rt-btn rt-btn-dismiss reading-time-ui-button reading-time-ui-button-secondary reading-time-ui-button-icon" aria-label="Dismiss">${DISMISS_ICON}</button>
  `;

  const saveBtn = bar.querySelector<HTMLButtonElement>(".rt-btn-save")!;
  saveBtn.addEventListener("click", async () => {
    if (!isValidWordsPerMinute(measuredWpm)) {
      saveBtn.disabled = true;
      saveBtn.textContent = `Out of range (${MIN_WORDS_PER_MINUTE}-${MAX_WORDS_PER_MINUTE})`;
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saved";
    setWordsPerMinute(measuredWpm);
    onWpmSavedCallback?.(measuredWpm);
  });

  bar.querySelector(".rt-btn-dismiss")!.addEventListener("click", () => {
    removeTimerBar();
  });
}

/**
 * Remove the timer bar from the page
 */
function removeTimerBar(): void {
  document.getElementById(TIMER_BAR_ID)?.remove();
  document.getElementById(TIMER_STYLE_ID)?.remove();
}

/**
 * Finish the reading speed test and compute measured WPM
 */
function finishReadingTest(): void {
  if (testStartTime === null) return;

  if (testIntervalId !== null) {
    clearInterval(testIntervalId);
    testIntervalId = null;
  }

  const elapsedSeconds = Math.max(
    1,
    Math.floor((Date.now() - testStartTime) / 1000),
  );
  const wordCount = countWords(getArticleText());
  const elapsedMinutes = elapsedSeconds / 60;
  const measuredWpm = Math.max(1, Math.round(wordCount / elapsedMinutes));

  testStartTime = null;

  showResultBar(measuredWpm);
}

/**
 * Start the reading speed test.
 * @param onWpmSaved Called with the measured WPM after the user saves the result.
 */
export function startReadingTest(onWpmSaved: (wpm: number) => void): void {
  if (testStartTime !== null) return;

  onWpmSavedCallback = onWpmSaved;
  testStartTime = Date.now();

  showTimerBar();

  testIntervalId = setInterval(() => {
    const bar = document.getElementById(TIMER_BAR_ID);
    const valueEl = bar?.querySelector(".rt-timer-value");
    if (valueEl && testStartTime !== null) {
      const elapsed = Math.floor((Date.now() - testStartTime) / 1000);
      valueEl.textContent = formatElapsed(elapsed);
    }
  }, 1000);
}

/**
 * Cancel the reading speed test without showing results
 */
export function cancelReadingTest(): void {
  if (testIntervalId !== null) {
    clearInterval(testIntervalId);
    testIntervalId = null;
  }
  testStartTime = null;
  onWpmSavedCallback = null;
  removeTimerBar();
}
