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
const TIMER_CONTENT_CLASS = "timer";
const TIMER_BODY_CLASS = "rt-timer-body";
const TIMER_LABEL_CLASS = "rt-timer-label";
const TIMER_VALUE_CLASS = "rt-timer-value";
const TIMER_RESULT_CLASS = "rt-timer-result";
const TIMER_BUTTON_CLASS = "rt-btn";
const TIMER_STOP_BUTTON_CLASS = "rt-btn-stop";
const TIMER_SAVE_BUTTON_CLASS = "rt-btn-save";
const TIMER_DISMISS_BUTTON_CLASS = "rt-btn-dismiss";
const DISMISS_ICON = `
  <img src="https://api.iconify.design/tabler/x.svg?color=%23ffffff" width="16" height="16" alt="" />
`;

let testStartTime: number | null = null;
let testIntervalId: ReturnType<typeof setInterval> | null = null;
let onWpmSavedCallback: ((wpm: number) => void) | null = null;

function createTimerBar(): {
  host: HTMLDivElement;
  bar: HTMLDivElement;
} {
  const host = document.createElement("div");
  host.id = TIMER_BAR_ID;
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    /* Reset inherited page styles at the shadow host boundary. */
    :host {
      all: initial;
      position: fixed;
      inset: auto 24px 24px auto;
      z-index: 2147483647;
      display: block;
      width: max-content;
      height: auto;
    }

    .${TIMER_CONTENT_CLASS} {
      box-sizing: border-box;
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
    .${TIMER_BODY_CLASS} {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .${TIMER_LABEL_CLASS} {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.55);
    }
    .${TIMER_VALUE_CLASS} {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #a78bfa;
    }
    .${TIMER_RESULT_CLASS} {
      font-size: 18px;
      font-weight: 700;
      color: #6ee7b7;
    }
    .${TIMER_BUTTON_CLASS} {
      box-sizing: border-box;
      appearance: none;
      -webkit-appearance: none;
      margin: 0;
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity 0.15s;
    }
    .${TIMER_BUTTON_CLASS}:hover { opacity: 0.85; }
    .${TIMER_BUTTON_CLASS}:active { opacity: 0.7; }
    .${TIMER_STOP_BUTTON_CLASS} {
      background: #6ee7b7;
      color: #064e3b;
    }
    .${TIMER_SAVE_BUTTON_CLASS} {
      background: #6ee7b7;
      color: #064e3b;
    }
    .${TIMER_SAVE_BUTTON_CLASS}:disabled {
      background: #6ee7b7;
      color: #064e3b;
      opacity: 0.5;
      cursor: default;
    }
    .${TIMER_DISMISS_BUTTON_CLASS} {
      background: rgba(255,255,255,0.12);
      color: #fff;
      width: 34px;
      height: 34px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;
  root.appendChild(style);
  const bar = document.createElement("div");
  bar.className = TIMER_CONTENT_CLASS;
  root.appendChild(bar);
  return { host, bar };
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
  const { host, bar } = createTimerBar();
  bar.innerHTML = `
    <div class="${TIMER_BODY_CLASS}">
      <span class="${TIMER_LABEL_CLASS}">Reading Speed Test</span>
      <span class="${TIMER_VALUE_CLASS}">0:00</span>
    </div>
    <button class="${TIMER_BUTTON_CLASS} ${TIMER_STOP_BUTTON_CLASS}">Finish</button>
    <button class="${TIMER_BUTTON_CLASS} ${TIMER_DISMISS_BUTTON_CLASS}" aria-label="Dismiss">${DISMISS_ICON}</button>
  `;

  document.body.appendChild(host);

  bar
    .querySelector(`.${TIMER_STOP_BUTTON_CLASS}`)!
    .addEventListener("click", () => {
      finishReadingTest();
    });

  bar
    .querySelector(`.${TIMER_DISMISS_BUTTON_CLASS}`)!
    .addEventListener("click", () => {
      cancelReadingTest();
    });
}

/**
 * Switch the timer bar to the "stopped / result" state
 */
function showResultBar(measuredWpm: number): void {
  const bar = document
    .getElementById(TIMER_BAR_ID)
    ?.shadowRoot?.querySelector(`.${TIMER_CONTENT_CLASS}`);
  if (!bar) return;

  bar.innerHTML = `
    <div class="${TIMER_BODY_CLASS}">
      <span class="${TIMER_LABEL_CLASS}">Your Reading Speed</span>
      <span class="${TIMER_RESULT_CLASS}">${measuredWpm.toLocaleString()} WPM</span>
    </div>
    <button class="${TIMER_BUTTON_CLASS} ${TIMER_SAVE_BUTTON_CLASS}">Save as WPM</button>
    <button class="${TIMER_BUTTON_CLASS} ${TIMER_DISMISS_BUTTON_CLASS}" aria-label="Dismiss">${DISMISS_ICON}</button>
  `;

  const saveBtn = bar.querySelector<HTMLButtonElement>(
    `.${TIMER_SAVE_BUTTON_CLASS}`,
  )!;
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

  bar
    .querySelector(`.${TIMER_DISMISS_BUTTON_CLASS}`)!
    .addEventListener("click", () => {
      removeTimerBar();
    });
}

/**
 * Remove the timer bar from the page
 */
function removeTimerBar(): void {
  document.getElementById(TIMER_BAR_ID)?.remove();
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
    const valueEl = document
      .getElementById(TIMER_BAR_ID)
      ?.shadowRoot?.querySelector(`.${TIMER_VALUE_CLASS}`);
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
