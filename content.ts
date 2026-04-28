/**
 * Content script - runs in the context of web pages
 * Analyzes page content for reading statistics
 */

const DEBUG_OUTLINE_OVERLAY_CLASS = "reading-time-debug-outline-overlay";
const DEBUG_LABEL_CLASS = "reading-time-debug-label";
const DEBUG_STYLE_ID = "reading-time-debug-style";
const DEBUG_WORD_CLASS = "reading-time-debug-word";

let originalPageTitle = document.title;
let lastAppliedReadingTitle: string | null = null;

/**
 * Check if debug mode is currently active on this page
 */
function isDebugActive(): boolean {
  return !!document.querySelector(`.${DEBUG_OUTLINE_OVERLAY_CLASS}`);
}

/**
 * Get the element used for text extraction
 */
function getTextElement(): Element {
  let mainElement = document.querySelector("main");
  if (!mainElement) {
    mainElement = document.querySelector('[role="main"]');
  }
  return mainElement || document.body;
}

/**
 * Extract text content from the page
 */
function getPageText(): string {
  const textElement = getTextElement();
  const bodyText = (textElement as HTMLElement).innerText;
  return bodyText || "";
}

/**
 * Inject debug styles into the page
 */
function ensureDebugStyles(): void {
  if (document.getElementById(DEBUG_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = DEBUG_STYLE_ID;
  style.textContent = `
    .${DEBUG_OUTLINE_OVERLAY_CLASS} {
      position: absolute;
      border: 3px dashed #667eea;
      pointer-events: none;
      z-index: 10000;
      box-sizing: border-box;
    }
    .${DEBUG_LABEL_CLASS} {
      position: absolute;
      background: #667eea;
      color: white;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 3px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      white-space: nowrap;
    }
    .${DEBUG_WORD_CLASS} {
      background: rgba(102, 126, 234, 0.15);
      outline: 1px solid rgba(102, 126, 234, 0.4);
      border-radius: 2px;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Build a short CSS selector string describing an element
 */
function describeSelector(el: Element): string {
  const tag = el.tagName.toLowerCase();
  let selector = tag;
  if (el.id) selector += `#${el.id}`;
  if (el.classList.length) {
    selector += Array.from(el.classList)
      .map((c) => `.${c}`)
      .join("");
  }
  const role = el.getAttribute("role");
  if (role) selector += `[role="${role}"]`;
  return selector;
}

/**
 * Create and position the outline overlay to match the target element
 */
function createOutlineOverlay(target: HTMLElement): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.className = DEBUG_OUTLINE_OVERLAY_CLASS;

  const label = document.createElement("div");
  label.className = DEBUG_LABEL_CLASS;
  overlay.appendChild(label);

  document.body.appendChild(overlay);
  positionOutlineOverlay(overlay, target);
  return overlay;
}

/**
 * Sync the outline overlay position/size with the target element
 */
function positionOutlineOverlay(
  overlay: HTMLDivElement,
  target: HTMLElement,
): void {
  const rect = target.getBoundingClientRect();
  overlay.style.top = `${rect.top}px`;
  overlay.style.left = `${rect.left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
}

let debugScrollHandler: (() => void) | null = null;

/**
 * Enable debug mode: outline the target element and highlight words
 */
function enableDebugMode(): void {
  disableDebugMode();
  ensureDebugStyles();

  const el = getTextElement() as HTMLElement;

  // Inject an absolutely positioned outline overlay
  const outlineOverlay = createOutlineOverlay(el);

  // Keep overlay in sync on scroll / resize
  debugScrollHandler = () => positionOutlineOverlay(outlineOverlay, el);
  // window.addEventListener("scroll", debugScrollHandler, { passive: true });
  window.addEventListener("resize", debugScrollHandler, { passive: true });

  // Walk text nodes inside the element and wrap each word in a span
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  for (const node of textNodes) {
    const text = node.nodeValue || "";
    const parts = text.split(/(\s+)/);
    if (parts.length <= 1 && !text.trim()) continue;

    const frag = document.createDocumentFragment();
    for (const part of parts) {
      if (/\S/.test(part)) {
        const span = document.createElement("span");
        span.className = DEBUG_WORD_CLASS;
        span.textContent = part;
        frag.appendChild(span);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    }
    node.parentNode?.replaceChild(frag, node);
  }

  // Update label with selector info and word count
  const label = outlineOverlay.querySelector(
    `.${DEBUG_LABEL_CLASS}`,
  ) as HTMLElement;
  if (label) {
    const wordCount = document.querySelectorAll(`.${DEBUG_WORD_CLASS}`).length;
    label.textContent = `${describeSelector(el)} • ${wordCount.toLocaleString()} words`;
  }
}

/**
 * Disable debug mode: remove outline, highlights, and overlay
 */
function disableDebugMode(): void {
  // Remove outline overlay element
  document.querySelector(`.${DEBUG_OUTLINE_OVERLAY_CLASS}`)?.remove();

  // Remove scroll/resize listeners
  if (debugScrollHandler) {
    window.removeEventListener("scroll", debugScrollHandler);
    window.removeEventListener("resize", debugScrollHandler);
    debugScrollHandler = null;
  }

  // Unwrap word highlight spans back to text nodes
  const wordSpans = Array.from(
    document.querySelectorAll(`.${DEBUG_WORD_CLASS}`),
  );
  for (const span of wordSpans) {
    const text = document.createTextNode(span.textContent || "");
    span.parentNode?.replaceChild(text, span);
  }

  // Merge adjacent text nodes for cleanliness
  document.body.normalize();

  // Remove injected style
  document.getElementById(DEBUG_STYLE_ID)?.remove();
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  return words.length;
}

/**
 * Calculate reading statistics
 */
function calculatePageStats(wordsPerMinute?: number): PageStats {
  const pageText = getPageText();

  const stats: PageStats = {
    wordCount: countWords(pageText),
    textLength: pageText.length,
  };

  if (wordsPerMinute && wordsPerMinute > 0) {
    stats.readingTime = Math.ceil(stats.wordCount / wordsPerMinute);
  }

  return stats;
}

/**
 * Prepend the latest estimate to the saved page title
 */
function appendReadingTimeToTitle(readingTimeLabel: string): void {
  // If the page changed its own title, refresh the saved original title.
  if (!lastAppliedReadingTitle || document.title !== lastAppliedReadingTitle) {
    originalPageTitle = document.title;
  }

  const updatedTitle = `[${readingTimeLabel}] ${originalPageTitle}`;
  document.title = updatedTitle;
  lastAppliedReadingTitle = updatedTitle;
}

/**
 * Listen for messages from the popup
 */
chrome.runtime.onMessage.addListener(
  (
    request: MessageRequest,
    _,
    sendResponse: (response: MessageResponse) => void,
  ) => {
    if (request.action === "getPageStats") {
      const stats = calculatePageStats(request.wordsPerMinute);
      if (typeof stats.readingTime === "number") {
        appendReadingTimeToTitle(
          stats.readingTime <= 1 ? "<1m" : `${stats.readingTime}m`,
        );
      }
      sendResponse({ stats });
    } else if (request.action === "toggleDebug") {
      if (request.enabled) {
        enableDebugMode();
      } else {
        disableDebugMode();
      }
    } else if (request.action === "getDebugState") {
      sendResponse({ debugActive: isDebugActive() });
    }
  },
);
