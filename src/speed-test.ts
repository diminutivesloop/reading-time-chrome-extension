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

const TIMER_BAR_ID = "reading-time-speed-timer";
const TIMER_STYLE_ID = "reading-time-speed-timer-style";

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
  style.textContent = `
    #${TIMER_BAR_ID} {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      background: #1a1a2e;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.32);
      padding: 14px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 280px;
      user-select: none;
    }
    #${TIMER_BAR_ID} .rt-timer-icon {
      font-size: 18px;
      line-height: 1;
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
      color: rgba(255,255,255,0.55);
    }
    #${TIMER_BAR_ID} .rt-timer-value {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #a78bfa;
    }
    #${TIMER_BAR_ID} .rt-timer-result {
      font-size: 18px;
      font-weight: 700;
      color: #6ee7b7;
    }
    #${TIMER_BAR_ID} .rt-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity 0.15s;
    }
    #${TIMER_BAR_ID} .rt-btn:hover { opacity: 0.85; }
    #${TIMER_BAR_ID} .rt-btn:active { opacity: 0.7; }
    #${TIMER_BAR_ID} .rt-btn-stop {
      background: #6ee7b7;
      color: #064e3b;
    }
    #${TIMER_BAR_ID} .rt-btn-save {
      background: #6ee7b7;
      color: #064e3b;
    }
    #${TIMER_BAR_ID} .rt-btn-save:disabled {
      background: #6ee7b7;
      color: #064e3b;
      opacity: 0.5;
      cursor: default;
    }
    #${TIMER_BAR_ID} .rt-btn-dismiss {
      background: rgba(255,255,255,0.12);
      color: #fff;
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
    <span class="rt-timer-icon">⏱</span>
    <div class="rt-timer-body">
      <span class="rt-timer-label">Reading Speed Test</span>
      <span class="rt-timer-value">0:00</span>
    </div>
    <button class="rt-btn rt-btn-stop">Finish</button>
    <button class="rt-btn rt-btn-dismiss" aria-label="Dismiss">✕</button>
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
    <span class="rt-timer-icon">📖</span>
    <div class="rt-timer-body">
      <span class="rt-timer-label">Your Reading Speed</span>
      <span class="rt-timer-result">${measuredWpm.toLocaleString()} WPM</span>
    </div>
    <button class="rt-btn rt-btn-save">Save as WPM</button>
    <button class="rt-btn rt-btn-dismiss" aria-label="Dismiss">✕</button>
  `;

  const saveBtn = bar.querySelector<HTMLButtonElement>(".rt-btn-save")!;
  saveBtn.addEventListener("click", async () => {
    if (!isValidWordsPerMinute(measuredWpm)) {
      saveBtn.disabled = true;
      saveBtn.textContent = `Out of range (${MIN_WORDS_PER_MINUTE}-${MAX_WORDS_PER_MINUTE})`;
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saved ✓";
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
